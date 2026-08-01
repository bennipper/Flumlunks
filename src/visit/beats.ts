import type { BoloDevice, VoiceResult } from "../bolo/BoloDevice";
import type { Beat, Card, Pack } from "../content/schema";

/**
 * Beat engine (BUILD.md §7) — the heart of the prototype.
 *
 * Core rule: nothing waits on the child. Every beat has a timeout and advances
 * regardless. A completely passive child still gets the full ~90 second stack.
 *
 * The engine is framework-agnostic: it drives a BoloDevice, emits a plain state
 * object for the UI to render, and exposes tappable equivalents for every live
 * voice action (BUILD.md §9). React subscribes via subscribe().
 */

// --- tunables -------------------------------------------------------------

/** Miss-handling ask window (BUILD.md §7 step 1). */
export const MIC_WINDOW_MS = 3000;
/** Photo beat timeout (BUILD.md §7 table). */
export const PHOTO_TIMEOUT_MS = 20000;
/** signHunt timeout (BUILD.md §7 table). */
export const SIGNHUNT_TIMEOUT_MS = 30000;
/** Resume the same card without replaying the fact if re-inserted within this. */
export const RESUME_WINDOW_MS = 30 * 60 * 1000;
/**
 * yesNo biases hard toward accepting (BUILD.md §7 step 6): any yes above this low
 * confidence floor is taken as a yes. The product would rather over-accept a happy
 * "yeah!" than leave a child feeling unheard.
 */
export const YESNO_CONFIDENCE_FLOOR = 0.2;

/** System lines Bolo speaks that aren't venue content. Shipped + approved (§7). */
export const SYSTEM_LINES: Record<string, string> = {
  "sys.fuzzy": "Hmm, my ears are a bit fuzzy today. Let's keep going.",
  "sys.resume": "Oh good, you're back. Let's carry on.",
  "sys.signAck": "Well spotted. You found it.",
};

// --- engine state ---------------------------------------------------------

export type EngineStatus =
  | "idle"
  | "playing"
  | "gap"
  | "listening"
  | "awaitPhoto";

export type TapAction = { id: string; label: string; run: () => void };

export type EngineState = {
  status: EngineStatus;
  cardId?: string;
  animal?: string;
  beatId?: string;
  beatKind?: Beat["kind"];
  beatIndex?: number;
  stackLength?: number;
  layer?: "core" | "deep";
  plainLabel: string;
  micRemainingMs: number;
  taps: TapAction[];
  photoRequest?: { cardId: string; prompt: string; beatId: string; style: string };
};

type CardProgress = {
  /** Number of core beats completed. */
  coreDone: number;
  completed: boolean;
  lastOutAt?: number;
  deepIndex: number;
};

export type EngineHooks = {
  onBeatHeard(cardId: string, beatId: string): void;
  onLearned(line: string): void;
  onBadge(badgeId: string): void;
  /** Ask the UI to open the camera for a photo beat. */
  requestCamera(req: { cardId: string; prompt: string; beatId: string; style: string }): void;
};

const IDLE_STATE: EngineState = {
  status: "idle",
  plainLabel: "Waiting for a card. Pop one into Bolo's rucksack.",
  micRemainingMs: 0,
  taps: [],
};

export class BeatEngine {
  private state: EngineState = IDLE_STATE;
  private listeners = new Set<(s: EngineState) => void>();
  private progress = new Map<string, CardProgress>();

  private runId = 0;
  private currentCardId: string | null = null;
  private cancelled = false;
  private gapMsValue = 4000;

  private tapResolve: ((r: VoiceResult) => void) | null = null;
  private photoResolve: ((key: string | null) => void) | null = null;
  private micCountdown: ReturnType<typeof setInterval> | null = null;

  private unsubs: (() => void)[] = [];
  /** Every card the device can recognise, across all owned+downloaded packs. */
  private cards = new Map<string, Card>();

  constructor(
    private device: BoloDevice,
    packs: Pack[],
    private hooks: EngineHooks
  ) {
    for (const pack of packs) {
      for (const card of pack.cards) this.cards.set(card.id, card);
    }
    this.unsubs.push(this.device.onCardIn((id) => this.onCardIn(id)));
    this.unsubs.push(this.device.onCardOut(() => this.onCardOut()));
    this.unsubs.push(this.device.onSqueeze((k) => this.onSqueeze(k)));
  }

  // --- public API ---------------------------------------------------------

  subscribe(cb: (s: EngineState) => void): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  getState(): EngineState {
    return this.state;
  }

  /** Called by the camera when a photo is captured (or dismissed with null). */
  submitPhoto(blobKey: string | null): void {
    this.photoResolve?.(blobKey);
  }

  /** Clear all per-card progress for a fresh visit. */
  reset(): void {
    this.cancelRun();
    this.progress.clear();
    this.currentCardId = null;
    this.setState(IDLE_STATE);
  }

  dispose(): void {
    this.cancelled = true;
    this.stopMicCountdown();
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.listeners.clear();
  }

  // --- card lifecycle -----------------------------------------------------

  private onCardIn(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;
    // Card swapped mid-beat → immediate switch, no confirmation (§7).
    void this.runCard(card);
  }

  private onCardOut(): void {
    // Stop immediately mid-sentence, save beat position (§7).
    const id = this.currentCardId;
    this.cancelRun();
    this.device.stop();
    this.device.setLed("idle");
    if (id) {
      const p = this.ensureProgress(id);
      p.lastOutAt = Date.now();
    }
    this.currentCardId = null;
    this.setState(IDLE_STATE);
  }

  private onSqueeze(kind: "single" | "double"): void {
    if (!this.currentCardId) return;
    const card = this.cards.get(this.currentCardId);
    if (!card) return;
    if (kind === "single") {
      // Pull a deep beat now (deep beats are pull-only, §6).
      void this.runDeep(card);
    }
    // A double squeeze is reserved; left as a no-op detent test (BUILD.md §15).
  }

  // --- run loops ----------------------------------------------------------

  private cancelRun(): void {
    this.runId++;
    this.cancelled = true;
    this.tapResolve = null;
    this.photoResolve?.(null);
    this.photoResolve = null;
    this.stopMicCountdown();
  }

  private async runCard(card: Card): Promise<void> {
    this.cancelRun();
    const myRun = ++this.runId;
    this.cancelled = false;
    this.currentCardId = card.id;

    const p = this.ensureProgress(card.id);
    const withinResume =
      p.lastOutAt !== undefined && Date.now() - p.lastOutAt < RESUME_WINDOW_MS;

    if (p.completed) {
      // Stack already done → reward re-insertion with a rotating deep beat (§7).
      await this.runDeep(card, myRun);
      return;
    }

    let startIndex = 0;
    if (p.coreDone > 0 && withinResume) {
      // Short resume recognition, continue from saved beat; don't replay the fact.
      startIndex = p.coreDone;
      await this.say("sys.resume", myRun);
      if (this.stale(myRun)) return;
    } else if (p.coreDone > 0 && !withinResume) {
      // Too long since it was pulled out — start the stack again from the top.
      p.coreDone = 0;
    }

    for (let i = startIndex; i < card.core.length; i++) {
      if (this.stale(myRun)) return;
      await this.runBeat(card, card.core[i], i, card.core.length, "core", myRun);
      if (this.stale(myRun)) return;
      p.coreDone = i + 1;
      await this.gap(myRun);
    }

    p.completed = true;
    if (!this.stale(myRun)) this.setState(IDLE_STATE);
  }

  private async runDeep(card: Card, run = ++this.runId): Promise<void> {
    if (card.deep.length === 0) {
      this.setState(IDLE_STATE);
      return;
    }
    this.cancelled = false;
    this.currentCardId = card.id;
    const p = this.ensureProgress(card.id);
    const beat = card.deep[p.deepIndex % card.deep.length];
    p.deepIndex++;
    await this.runBeat(card, beat, p.deepIndex, card.deep.length, "deep", run);
    if (!this.stale(run)) {
      await this.gap(run);
      if (!this.stale(run)) this.setState(IDLE_STATE);
    }
  }

  // --- per-beat -----------------------------------------------------------

  private async runBeat(
    card: Card,
    beat: Beat,
    index: number,
    stackLength: number,
    layer: "core" | "deep",
    run: number
  ): Promise<void> {
    this.publishBeat(card, beat, index, stackLength, layer);
    switch (beat.kind) {
      case "recognition":
      case "fact":
      case "badge":
        await this.say(beat.audioId, run);
        break;
      case "lookFor":
        await this.runLookFor(beat, run);
        break;
      case "energy":
        await this.runEnergy(card, beat, run);
        break;
      case "choice":
        await this.runChoice(card, beat, run);
        break;
      case "yesNo":
        await this.runYesNo(card, beat, run);
        break;
      case "signHunt":
        await this.runSignHunt(card, beat, run);
        break;
      case "photo":
        await this.runPhoto(card, beat, run);
        break;
    }
    if (this.stale(run)) return;
    // Record outcomes only once the beat actually completed on this run.
    this.hooks.onBeatHeard(card.id, beat.id);
    if (beat.kind === "fact") this.hooks.onLearned(beat.learnedLine);
    if (beat.kind === "badge" && card.badgeId) this.hooks.onBadge(card.badgeId);
  }

  private async runLookFor(
    beat: Extract<Beat, { kind: "lookFor" }>,
    run: number
  ): Promise<void> {
    this.setTaps([
      {
        id: "notVisible",
        label: "Can't see it",
        run: () => {
          this.device.stop();
          void this.say(beat.notVisibleAudioId, run);
        },
      },
    ]);
    await this.say(beat.audioId, run);
    this.setTaps([]);
  }

  private async runEnergy(
    _card: Card,
    beat: Extract<Beat, { kind: "energy" }>,
    run: number
  ): Promise<void> {
    await this.say(beat.audioId, run);
    if (this.stale(run)) return;

    const succeed = (): VoiceResult =>
      beat.mode === "quiet"
        ? { kind: "energy", peak: 0, claps: 0 }
        : beat.mode === "loud"
          ? { kind: "energy", peak: 1, claps: 0 }
          : { kind: "energy", peak: 1, claps: beat.claps ?? 1 };

    const isSuccess = (r: VoiceResult): boolean => {
      if (r.kind !== "energy") return false;
      if (beat.mode === "quiet") return r.peak <= beat.threshold;
      if (beat.mode === "loud") return r.peak >= beat.threshold;
      return r.claps >= (beat.claps ?? 1);
    };

    const label =
      beat.mode === "quiet"
        ? "Everyone was quiet"
        : beat.mode === "loud"
          ? "We did the roar"
          : `We did ${beat.claps ?? 1} claps`;

    const r = await this.askWithRetry(beat.audioId, run, label, () => succeed());
    if (this.stale(run)) return;
    if (r && isSuccess(r)) await this.say(beat.successAudioId, run);
  }

  private async runChoice(
    _card: Card,
    beat: Extract<Beat, { kind: "choice" }>,
    run: number
  ): Promise<void> {
    await this.say(beat.audioId, run);
    if (this.stale(run)) return;

    const words = ["one", "two", "three"] as const;
    const taps: TapAction[] = words.slice(0, beat.options).map((w, i) => ({
      id: w,
      label: String(i + 1),
      run: () => this.tapResolve?.({ kind: "keyword", word: w, confidence: 1 }),
    }));

    const r = await this.askWithRetry(beat.audioId, run, undefined, undefined, taps);
    if (this.stale(run) || !r) return;
    if (r.kind === "keyword") {
      const chosen = words.indexOf(r.word as (typeof words)[number]) + 1;
      if (chosen === beat.correct) await this.say(beat.correctAudioId, run);
      else await this.say(beat.wrongAudioId, run);
    }
  }

  private async runYesNo(
    _card: Card,
    beat: Extract<Beat, { kind: "yesNo" }>,
    run: number
  ): Promise<void> {
    await this.say(beat.audioId, run);
    if (this.stale(run)) return;

    const taps: TapAction[] = [
      {
        id: "yes",
        label: "Yes",
        run: () => this.tapResolve?.({ kind: "keyword", word: "yes", confidence: 1 }),
      },
      {
        id: "no",
        label: "No",
        run: () => this.tapResolve?.({ kind: "keyword", word: "no", confidence: 1 }),
      },
    ];

    const r = await this.askWithRetry(beat.audioId, run, undefined, undefined, taps);
    if (this.stale(run) || !r) return;
    if (r.kind === "keyword") {
      const yes = r.word === "yes" && r.confidence >= YESNO_CONFIDENCE_FLOOR;
      const no = r.word === "no";
      if (yes) await this.say(beat.yesAudioId, run);
      else if (no) await this.say(beat.noAudioId, run);
      // Anything else already fell through askWithRetry's absorb path.
    }
  }

  private async runSignHunt(
    _card: Card,
    beat: Extract<Beat, { kind: "signHunt" }>,
    run: number
  ): Promise<void> {
    await this.say(beat.audioId, run);
    if (this.stale(run)) return;

    const taps: TapAction[] = [
      {
        id: "found",
        label: "Found it",
        run: () =>
          this.tapResolve?.({ kind: "keyword", word: beat.word, confidence: 1 }),
      },
    ];
    this.setStatus("listening");
    this.device.setLed("listening");
    const r = await this.awaitAnswer(SIGNHUNT_TIMEOUT_MS, taps);
    this.device.setLed("attention");
    if (this.stale(run)) return;
    const found =
      r.kind === "keyword" && (r.word === beat.word || r.word === "yes");
    if (found) await this.say("sys.signAck", run);
    this.setTaps([]);
  }

  private async runPhoto(
    card: Card,
    beat: Extract<Beat, { kind: "photo" }>,
    run: number
  ): Promise<void> {
    await this.say(beat.audioId, run);
    if (this.stale(run)) return;

    this.setState({
      ...this.state,
      status: "awaitPhoto",
      photoRequest: {
        cardId: card.id,
        prompt: beat.prompt,
        beatId: beat.id,
        style: beat.style,
      },
      taps: [
        {
          id: "openCamera",
          label: "Take the photo",
          run: () =>
            this.hooks.requestCamera({
              cardId: card.id,
              prompt: beat.prompt,
              beatId: beat.id,
              style: beat.style,
            }),
        },
      ],
    });

    const key = await new Promise<string | null>((resolve) => {
      this.photoResolve = resolve;
      const timer = setTimeout(() => resolve(null), PHOTO_TIMEOUT_MS);
      const orig = this.photoResolve;
      this.photoResolve = (k) => {
        clearTimeout(timer);
        orig?.(k);
      };
    });
    this.photoResolve = null;
    void key; // the store records the photo; the beat only needs to advance
    this.setState({ ...this.state, photoRequest: undefined, taps: [] });
  }

  // --- miss handling (BUILD.md §7) ----------------------------------------

  /**
   * Ask → interpret with the exact miss policy: silence advances with no retry;
   * one unrecognised earns a single rephrase and one more window; a second
   * unrecognised is absorbed in character and we advance. Never a third attempt,
   * never "I didn't understand".
   */
  private async askWithRetry(
    rephraseAudioId: string,
    run: number,
    _label?: string,
    _succeedFactory?: () => VoiceResult,
    taps?: TapAction[]
  ): Promise<VoiceResult | null> {
    const first = await this.ask(MIC_WINDOW_MS, taps);
    if (this.stale(run)) return null;
    if (first.kind === "silence") return first; // looking at the animal — that's the product working
    if (first.kind !== "unrecognised") return first;

    // One rephrase, one more window.
    await this.say(rephraseAudioId, run);
    if (this.stale(run)) return null;
    const second = await this.ask(MIC_WINDOW_MS, taps);
    if (this.stale(run)) return null;
    if (second.kind === "silence" || second.kind === "unrecognised") {
      await this.say("sys.fuzzy", run);
      return null;
    }
    return second;
  }

  private async ask(windowMs: number, taps?: TapAction[]): Promise<VoiceResult> {
    this.device.chirp("micOpen");
    this.device.setLed("listening");
    this.setStatus("listening");
    const r = await this.awaitAnswer(windowMs, taps);
    this.device.chirp("micClose");
    this.device.setLed("attention");
    this.setStatus("playing");
    return r;
  }

  /** Race the real/injected mic against the on-screen tappable equivalents. */
  private awaitAnswer(windowMs: number, taps?: TapAction[]): Promise<VoiceResult> {
    if (taps) this.setTaps(taps);
    this.startMicCountdown(windowMs);
    return new Promise<VoiceResult>((resolve) => {
      let settled = false;
      const finish = (r: VoiceResult) => {
        if (settled) return;
        settled = true;
        this.tapResolve = null;
        this.stopMicCountdown();
        this.setTaps([]);
        resolve(r);
      };
      this.tapResolve = finish;
      void this.device.openMic(windowMs).then(finish);
    });
  }

  // --- primitives ---------------------------------------------------------

  private async say(audioId: string, run: number): Promise<void> {
    if (this.stale(run)) return;
    this.setStatus("playing");
    await this.device.say(audioId);
  }

  private gap(run: number): Promise<void> {
    // Protected content: where the child talks to their parent (§7). Read live.
    const gapMs = this.gapMs();
    this.setStatus("gap");
    this.setTaps([]);
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, gapMs);
      // If the run is superseded, resolve early so we don't hang.
      const check = setInterval(() => {
        if (this.stale(run)) {
          clearTimeout(timer);
          clearInterval(check);
          resolve();
        }
      }, 120);
      setTimeout(() => clearInterval(check), gapMs + 50);
    });
  }

  // --- state plumbing -----------------------------------------------------

  private gapMs(): number {
    return this.gapMsValue;
  }
  setGapMs(ms: number): void {
    this.gapMsValue = ms;
  }

  private ensureProgress(cardId: string): CardProgress {
    let p = this.progress.get(cardId);
    if (!p) {
      p = { coreDone: 0, completed: false, deepIndex: 0 };
      this.progress.set(cardId, p);
    }
    return p;
  }

  private stale(run: number): boolean {
    return this.cancelled || run !== this.runId;
  }

  private setState(next: EngineState): void {
    this.state = next;
    this.listeners.forEach((cb) => cb(next));
  }

  private setStatus(status: EngineStatus): void {
    this.setState({ ...this.state, status });
  }

  private setTaps(taps: TapAction[]): void {
    this.setState({ ...this.state, taps });
  }

  private publishBeat(
    card: Card,
    beat: Beat,
    index: number,
    stackLength: number,
    layer: "core" | "deep"
  ): void {
    this.setState({
      status: "playing",
      cardId: card.id,
      animal: card.animal,
      beatId: beat.id,
      beatKind: beat.kind,
      beatIndex: index,
      stackLength,
      layer,
      plainLabel: plainLabel(beat, card),
      micRemainingMs: 0,
      taps: [],
    });
  }

  private startMicCountdown(windowMs: number): void {
    this.stopMicCountdown();
    const deadline = Date.now() + windowMs;
    this.setState({ ...this.state, micRemainingMs: windowMs });
    this.micCountdown = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      this.setState({ ...this.state, micRemainingMs: remaining });
      if (remaining <= 0) this.stopMicCountdown();
    }, 100);
  }

  private stopMicCountdown(): void {
    if (this.micCountdown) {
      clearInterval(this.micCountdown);
      this.micCountdown = null;
    }
    if (this.state.micRemainingMs !== 0) {
      this.setState({ ...this.state, micRemainingMs: 0 });
    }
  }
}

export function plainLabel(beat: Beat, card: Card): string {
  switch (beat.kind) {
    case "recognition":
      return `Saying hello at the ${card.animal.toLowerCase()}`;
    case "lookFor":
      return "Pointing out what to look for";
    case "fact":
      return `Sharing something about the ${card.animal.toLowerCase()}`;
    case "energy":
      return beat.mode === "quiet"
        ? "Asking everyone to be gentle and quiet"
        : beat.mode === "loud"
          ? `Time for a big ${card.animal.toLowerCase()} roar`
          : `Asking for ${beat.claps ?? 1} claps`;
    case "choice":
      return `Asking a question — say one, two${beat.options === 3 ? " or three" : ""}`;
    case "yesNo":
      return "Asking a yes or no question";
    case "photo":
      return "Time for a photo";
    case "signHunt":
      return `Looking for the sign that says “${beat.word}”`;
    case "badge":
      return `Handing over the ${card.animal.toLowerCase()} badge`;
  }
}
