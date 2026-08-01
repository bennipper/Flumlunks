import type { Beat, Card, Pack } from "../../src/content/schema";
import type { EngineHooks } from "../../src/visit/beats";

/** Build a single-card pack from a list of core beats, for isolating one beat. */
export function packWith(core: Beat[], deep: Beat[] = []): Pack {
  const card: Card = {
    id: "test",
    animal: "Test Animal",
    zone: "Test Zone",
    keyword: "bonobo",
    noiseSensitive: false,
    core,
    deep,
    badgeId: "test-badge",
  };
  return {
    id: "twycross",
    version: "test",
    venueName: "Twycross Zoo",
    approvedBy: "test",
    approvedAt: "2026-01-01T00:00:00.000Z",
    vocabulary: ["yes", "no", "one", "two", "three", "bonobo", "quiet"],
    cards: [card],
    badges: [
      { id: "test-badge", name: "Tester", animal: "Test Animal", colour: "#0F5C3F", motif: "T" },
    ],
    audio: {},
  };
}

export function recordingHooks(): EngineHooks & {
  beatsHeard: string[];
  learned: string[];
  badges: string[];
  cameraRequests: number;
} {
  const beatsHeard: string[] = [];
  const learned: string[] = [];
  const badges: string[] = [];
  return {
    beatsHeard,
    learned,
    badges,
    cameraRequests: 0,
    onBeatHeard: (_c, b) => beatsHeard.push(b),
    onLearned: (l) => learned.push(l),
    onBadge: (b) => badges.push(b),
    requestCamera() {
      this.cameraRequests++;
    },
  };
}
