import type {
  BoloDevice,
  BoloStatus,
  LedState,
  Unsubscribe,
  VoiceResult,
} from "../../src/bolo/BoloDevice";

/**
 * A scriptable BoloDevice for engine tests. say() resolves immediately (audio end),
 * openMic() returns queued results or falls back to silence after the window — so a
 * passive run drives itself, exactly as the real product must (BUILD.md §7).
 */
export class FakeBolo implements BoloDevice {
  said: string[] = [];
  openMicCalls = 0;
  led: LedState = "idle";
  private micQueue: VoiceResult[] = [];
  private cardIn = new Set<(id: string) => void>();
  private cardOut = new Set<() => void>();
  private squeeze = new Set<(k: "single" | "double") => void>();

  queueMic(...results: VoiceResult[]): void {
    this.micQueue.push(...results);
  }

  onCardIn(cb: (id: string) => void): Unsubscribe {
    this.cardIn.add(cb);
    return () => this.cardIn.delete(cb);
  }
  onCardOut(cb: () => void): Unsubscribe {
    this.cardOut.add(cb);
    return () => this.cardOut.delete(cb);
  }
  onSqueeze(cb: (k: "single" | "double") => void): Unsubscribe {
    this.squeeze.add(cb);
    return () => this.squeeze.delete(cb);
  }

  say(audioId: string): Promise<void> {
    this.said.push(audioId);
    return Promise.resolve();
  }
  stop(): void {}
  chirp(): void {}
  setLed(state: LedState): void {
    this.led = state;
  }
  openMic(windowMs: number): Promise<VoiceResult> {
    this.openMicCalls++;
    const next = this.micQueue.shift();
    if (next) return Promise.resolve(next);
    return new Promise((r) => setTimeout(() => r({ kind: "silence" }), windowMs));
  }
  status(): BoloStatus {
    return { battery: 1, muted: false, connected: true };
  }

  emitCardIn(id: string): void {
    this.cardIn.forEach((cb) => cb(id));
  }
  emitCardOut(): void {
    this.cardOut.forEach((cb) => cb());
  }
  emitSqueeze(k: "single" | "double"): void {
    this.squeeze.forEach((cb) => cb(k));
  }
}
