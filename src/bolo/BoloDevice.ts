/**
 * BoloDevice (BUILD.md §5) — the seam for the real toy. Every screen and the beat
 * engine talk to this interface only. When the hardware exists, SimBolo is swapped
 * for a BLE implementation and no screen code changes. No screen may import SimBolo
 * directly; it comes only from the factory in ./index.ts.
 */

export type Unsubscribe = () => void;

export type VoiceResult =
  | { kind: "keyword"; word: string; confidence: number }
  | { kind: "energy"; peak: number; claps: number }
  | { kind: "silence" }
  | { kind: "unrecognised" };

export type LedState = "idle" | "attention" | "listening" | "off";

export type BoloStatus = { battery: number; muted: boolean; connected: boolean };

export interface BoloDevice {
  onCardIn(cb: (cardId: string) => void): Unsubscribe;
  onCardOut(cb: () => void): Unsubscribe;
  onSqueeze(cb: (kind: "single" | "double") => void): Unsubscribe;

  /** Resolves on playback end, or early when stop() interrupts it. */
  say(audioId: string): Promise<void>;
  stop(): void;
  chirp(kind: "micOpen" | "micClose"): void;
  setLed(state: LedState): void;

  openMic(windowMs: number): Promise<VoiceResult>;
  status(): BoloStatus;
}
