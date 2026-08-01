import type {
  BoloDevice,
  BoloStatus,
  LedState,
  Unsubscribe,
  VoiceResult,
} from "./BoloDevice";
import { setVocabulary } from "./voice";

/**
 * SimBolo (BUILD.md §5) — the web implementation of BoloDevice. It speaks through
 * the device speaker (close enough for pacing, useless for judging mix) and takes
 * card/squeeze/voice input from the debug panel. The extra `inject*` and `set*`
 * methods here are sim-only tooling for the debug panel; the beat engine and
 * screens only ever see the BoloDevice interface.
 *
 * Speech: authored transcripts ship in the pack (hard rule §7). In the prototype
 * we voice them with the browser's speech synthesis so outdoor pacing tests are
 * meaningful; when the real recorded audio exists it plays instead. Either way the
 * words are human-approved and shipped, never generated at runtime.
 */

export type SimState = {
  led: LedState;
  speaking: boolean;
  micOpen: boolean;
  micRemainingMs: number;
  useRealMic: boolean;
  lastResult?: VoiceResult;
};

type PendingSay = { resolve: () => void };
type PendingMic = {
  resolve: (r: VoiceResult) => void;
  timer: ReturnType<typeof setTimeout>;
  deadline: number;
};

const WORD_MS = 320;
const SAY_MIN_MS = 900;
const SAY_MAX_MS = 9000;

export class SimBolo implements BoloDevice {
  private cardInCbs = new Set<(id: string) => void>();
  private cardOutCbs = new Set<() => void>();
  private squeezeCbs = new Set<(k: "single" | "double") => void>();
  private stateCbs = new Set<(s: SimState) => void>();

  private manifest: Record<string, string> = {};
  private muted = false;
  private volumeCeiling = 1;
  private connected = true;
  private battery = 0.86;

  private led: LedState = "idle";
  private speaking = false;
  private useRealMic = false;

  private pendingSay: PendingSay | null = null;
  private sayTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMic: PendingMic | null = null;
  private micTick: ReturnType<typeof setInterval> | null = null;
  private lastResult: VoiceResult | undefined;

  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;

  // ---- subscriptions -------------------------------------------------------

  onCardIn(cb: (id: string) => void): Unsubscribe {
    this.cardInCbs.add(cb);
    return () => this.cardInCbs.delete(cb);
  }
  onCardOut(cb: () => void): Unsubscribe {
    this.cardOutCbs.add(cb);
    return () => this.cardOutCbs.delete(cb);
  }
  onSqueeze(cb: (k: "single" | "double") => void): Unsubscribe {
    this.squeezeCbs.add(cb);
    return () => this.squeezeCbs.delete(cb);
  }
  onState(cb: (s: SimState) => void): Unsubscribe {
    this.stateCbs.add(cb);
    cb(this.snapshot());
    return () => this.stateCbs.delete(cb);
  }

  // ---- BoloDevice ----------------------------------------------------------

  say(audioId: string): Promise<void> {
    this.stopSpeech();
    const transcript = this.manifest[audioId] ?? audioId;
    const words = transcript.split(/\s+/).filter(Boolean).length || 1;
    const durationMs = Math.min(SAY_MAX_MS, Math.max(SAY_MIN_MS, words * WORD_MS));

    this.speaking = true;
    this.emit();

    return new Promise<void>((resolve) => {
      const done = () => {
        if (this.pendingSay?.resolve !== resolve) return;
        this.pendingSay = null;
        if (this.sayTimer) clearTimeout(this.sayTimer);
        this.sayTimer = null;
        this.speaking = false;
        this.emit();
        resolve();
      };
      this.pendingSay = { resolve: done };
      // Fallback timer always resolves so a beat never hangs on a missing voice.
      this.sayTimer = setTimeout(done, durationMs + 250);

      const spoke = this.speak(transcript, done);
      if (!spoke) this.tone(durationMs);
    });
  }

  stop(): void {
    this.stopSpeech();
  }

  chirp(kind: "micOpen" | "micClose"): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const [a, b] = kind === "micOpen" ? [660, 990] : [990, 660];
    osc.frequency.setValueAtTime(a, now);
    osc.frequency.exponentialRampToValueAtTime(b, now + 0.12);
    const vol = 0.06 * this.volumeCeiling;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  setLed(state: LedState): void {
    this.led = state;
    this.emit();
  }

  openMic(windowMs: number): Promise<VoiceResult> {
    this.cancelMic({ kind: "silence" }, false);
    if (this.useRealMic) return this.openRealMic(windowMs);

    return new Promise<VoiceResult>((resolve) => {
      const deadline = Date.now() + windowMs;
      const timer = setTimeout(() => this.cancelMic({ kind: "silence" }, true), windowMs);
      this.pendingMic = { resolve, timer, deadline };
      this.micTick = setInterval(() => this.emit(), 100);
      this.emit();
    });
  }

  status(): BoloStatus {
    return { battery: this.battery, muted: this.muted, connected: this.connected };
  }

  // ---- sim-only: input injection (debug panel) -----------------------------

  injectCardIn(cardId: string): void {
    this.cardInCbs.forEach((cb) => cb(cardId));
  }
  injectCardOut(): void {
    this.cardOutCbs.forEach((cb) => cb());
  }
  injectSqueeze(kind: "single" | "double"): void {
    this.squeezeCbs.forEach((cb) => cb(kind));
  }
  /** Resolve an open mic window with an injected result. No-op if mic is closed. */
  injectVoice(result: VoiceResult): boolean {
    if (!this.pendingMic) return false;
    this.cancelMic(result, false);
    return true;
  }

  // ---- sim-only: configuration ---------------------------------------------

  setManifest(audio: Record<string, string>, vocabulary: string[]): void {
    this.manifest = audio;
    setVocabulary(vocabulary);
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopSpeech();
    this.emit();
  }
  setVolumeCeiling(v: number): void {
    this.volumeCeiling = Math.max(0, Math.min(1, v));
  }
  setConnected(c: boolean): void {
    this.connected = c;
    this.emit();
  }
  setUseRealMic(on: boolean): void {
    this.useRealMic = on;
    this.emit();
  }
  getState(): SimState {
    return this.snapshot();
  }
  /** Resume the audio context from a user gesture (autoplay policy). */
  primeAudio(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  // ---- internals -----------------------------------------------------------

  private snapshot(): SimState {
    const micRemainingMs = this.pendingMic
      ? Math.max(0, this.pendingMic.deadline - Date.now())
      : 0;
    return {
      led: this.led,
      speaking: this.speaking,
      micOpen: this.pendingMic !== null,
      micRemainingMs,
      useRealMic: this.useRealMic,
      lastResult: this.lastResult,
    };
  }

  private emit(): void {
    const s = this.snapshot();
    this.stateCbs.forEach((cb) => cb(s));
  }

  private stopSpeech(): void {
    if (this.sayTimer) {
      clearTimeout(this.sayTimer);
      this.sayTimer = null;
    }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    const pending = this.pendingSay;
    this.pendingSay = null;
    this.speaking = false;
    if (pending) pending.resolve();
    this.emit();
  }

  private cancelMic(result: VoiceResult, timedOut: boolean): void {
    const pending = this.pendingMic;
    if (this.micTick) {
      clearInterval(this.micTick);
      this.micTick = null;
    }
    if (!pending) return;
    if (!timedOut) clearTimeout(pending.timer);
    this.pendingMic = null;
    this.lastResult = result;
    this.emit();
    pending.resolve(result);
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!this.audioCtx) this.audioCtx = new Ctor();
    return this.audioCtx;
  }

  /** A soft tone bed used when speech synthesis is muted or unavailable. */
  private tone(durationMs: number): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 320;
    const vol = 0.03 * this.volumeCeiling;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.05);
    gain.gain.setValueAtTime(vol, now + durationMs / 1000 - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }

  private speak(text: string, onEnd: () => void): boolean {
    if (this.muted || this.volumeCeiling <= 0) return false;
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined")
      return false;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1.15;
    u.volume = Math.min(1, this.volumeCeiling);
    u.onend = onEnd;
    // If synthesis errors (some engines on interrupt), the say() fallback timer
    // still resolves the beat, so we do not need to handle onerror explicitly.
    speechSynthesis.speak(u);
    return true;
  }

  private async openRealMic(windowMs: number): Promise<VoiceResult> {
    const ctx = this.ensureCtx();
    if (!ctx || !navigator.mediaDevices?.getUserMedia) {
      // Fall back to a silence result so a beat still advances.
      return new Promise((r) => setTimeout(() => r({ kind: "silence" }), windowMs));
    }
    try {
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const source = ctx.createMediaStreamSource(this.micStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      const deadline = Date.now() + windowMs;
      this.pendingMic = { resolve: () => {}, timer: setTimeout(() => {}, windowMs), deadline };
      this.micTick = setInterval(() => this.emit(), 100);
      this.emit();

      let peak = 0;
      let claps = 0;
      let above = false;
      const CLAP_ON = 0.28;
      const CLAP_OFF = 0.12;

      return await new Promise<VoiceResult>((resolve) => {
        const loop = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          peak = Math.max(peak, rms);
          if (!above && rms > CLAP_ON) {
            above = true;
            claps++;
          } else if (above && rms < CLAP_OFF) {
            above = false;
          }
          if (Date.now() >= deadline) {
            source.disconnect();
            this.cancelMicReal();
            const result: VoiceResult =
              peak < 0.03 ? { kind: "silence" } : { kind: "energy", peak, claps };
            this.lastResult = result;
            this.emit();
            resolve(result);
            return;
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    } catch {
      this.cancelMicReal();
      return { kind: "silence" };
    }
  }

  private cancelMicReal(): void {
    if (this.micTick) {
      clearInterval(this.micTick);
      this.micTick = null;
    }
    this.pendingMic = null;
  }
}
