import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeatEngine } from "../src/visit/beats";
import type { Beat, Pack } from "../src/content/schema";
import { loadPack } from "../src/content/loader";
import packJson from "../src/content/packs/twycross/pack.json";
import { FakeBolo } from "./helpers/fakeBolo";
import { packWith, recordingHooks } from "./helpers/packs";

function make(pack: Pack) {
  const bolo = new FakeBolo();
  const hooks = recordingHooks();
  const engine = new BeatEngine(bolo, pack, hooks);
  engine.setGapMs(5);
  return { bolo, engine, hooks };
}

async function settle(ms = 70000) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("per-beat end conditions", () => {
  it("recognition, fact, lookFor and badge end on audio with no mic", async () => {
    const beats: Beat[] = [
      { kind: "recognition", id: "r", audioId: "r" },
      { kind: "lookFor", id: "l", audioId: "l", notVisibleAudioId: "lnv" },
      { kind: "fact", id: "f", audioId: "f", learnedLine: "I learned a thing." },
      { kind: "badge", id: "b", audioId: "b" },
    ];
    const { bolo, engine, hooks } = make(packWith(beats));
    bolo.emitCardIn("test");
    await settle();
    expect(bolo.openMicCalls).toBe(0);
    expect(hooks.beatsHeard).toEqual(["r", "l", "f", "b"]);
    expect(hooks.learned).toEqual(["I learned a thing."]);
    expect(hooks.badges).toEqual(["test-badge"]);
    engine.dispose();
  });

  it("energy (quiet/loud/claps) succeeds on a matching result", async () => {
    const cases: { beat: Beat; result: Parameters<FakeBolo["queueMic"]>[0] }[] = [
      {
        beat: { kind: "energy", id: "q", audioId: "q", mode: "quiet", threshold: 0.2, successAudioId: "qS" },
        result: { kind: "energy", peak: 0.05, claps: 0 },
      },
      {
        beat: { kind: "energy", id: "ld", audioId: "ld", mode: "loud", threshold: 0.7, successAudioId: "ldS" },
        result: { kind: "energy", peak: 0.9, claps: 0 },
      },
      {
        beat: { kind: "energy", id: "c", audioId: "c", mode: "claps", threshold: 0.3, claps: 3, successAudioId: "cS" },
        result: { kind: "energy", peak: 0.5, claps: 3 },
      },
    ];
    for (const { beat, result } of cases) {
      const { bolo, engine } = make(packWith([beat]));
      bolo.queueMic(result);
      bolo.emitCardIn("test");
      await settle();
      expect(bolo.said).toContain(`${beat.id}S`);
      engine.dispose();
    }
  });

  it("choice plays the correct or wrong line by recognised number", async () => {
    const beat: Beat = {
      kind: "choice", id: "ch", audioId: "ch", options: 3, correct: 2,
      correctAudioId: "chC", wrongAudioId: "chW",
    };
    const right = make(packWith([beat]));
    right.bolo.queueMic({ kind: "keyword", word: "two", confidence: 1 });
    right.bolo.emitCardIn("test");
    await settle();
    expect(right.bolo.said).toContain("chC");
    right.engine.dispose();

    const wrong = make(packWith([beat]));
    wrong.bolo.queueMic({ kind: "keyword", word: "one", confidence: 1 });
    wrong.bolo.emitCardIn("test");
    await settle();
    expect(wrong.bolo.said).toContain("chW");
    wrong.engine.dispose();
  });

  it("yesNo plays yes/no lines and photo ends on capture", async () => {
    const yn: Beat = { kind: "yesNo", id: "yn", audioId: "yn", yesAudioId: "ynY", noAudioId: "ynN" };
    const yes = make(packWith([yn]));
    yes.bolo.queueMic({ kind: "keyword", word: "yes", confidence: 1 });
    yes.bolo.emitCardIn("test");
    await settle();
    expect(yes.bolo.said).toContain("ynY");
    yes.engine.dispose();

    const photo: Beat = { kind: "photo", id: "ph", audioId: "ph", prompt: "Smile", style: "action" };
    const p = make(packWith([photo]));
    p.bolo.emitCardIn("test");
    await vi.advanceTimersByTimeAsync(50);
    p.engine.submitPhoto("blob-key");
    await settle();
    expect(p.hooks.beatsHeard).toContain("ph");
    p.engine.dispose();
  });

  it("photo advances on the 20s timeout with no capture", async () => {
    const photo: Beat = { kind: "photo", id: "ph", audioId: "ph", prompt: "Smile", style: "action" };
    const { bolo, engine, hooks } = make(packWith([photo]));
    bolo.emitCardIn("test");
    await settle();
    expect(hooks.beatsHeard).toContain("ph");
    engine.dispose();
  });

  it("signHunt ends on the sign word and on timeout", async () => {
    const sh: Beat = { kind: "signHunt", id: "sh", audioId: "sh", word: "quiet" };
    const found = make(packWith([sh]));
    found.bolo.queueMic({ kind: "keyword", word: "quiet", confidence: 1 });
    found.bolo.emitCardIn("test");
    await settle();
    expect(found.bolo.said).toContain("sys.signAck");
    found.engine.dispose();

    const timedOut = make(packWith([sh]));
    timedOut.bolo.emitCardIn("test");
    await settle();
    expect(timedOut.hooks.beatsHeard).toContain("sh");
    expect(timedOut.bolo.said).not.toContain("sys.signAck");
    timedOut.engine.dispose();
  });
});

describe("miss handling (BUILD.md §7)", () => {
  const yn: Beat = { kind: "yesNo", id: "yn", audioId: "yn", yesAudioId: "ynY", noAudioId: "ynN" };

  it("silence advances immediately with no retry", async () => {
    const { bolo, engine } = make(packWith([yn]));
    bolo.emitCardIn("test"); // no mic queued → silence
    await settle();
    expect(bolo.openMicCalls).toBe(1);
    engine.dispose();
  });

  it("unrecognised earns exactly one rephrase, never a third attempt", async () => {
    const { bolo, engine } = make(packWith([yn]));
    bolo.queueMic({ kind: "unrecognised" }, { kind: "unrecognised" });
    bolo.emitCardIn("test");
    await settle();
    expect(bolo.openMicCalls).toBe(2);
    expect(bolo.said.filter((s) => s === "sys.fuzzy")).toHaveLength(1);
    expect(bolo.said).not.toContain("ynY");
    expect(bolo.said).not.toContain("ynN");
    engine.dispose();
  });

  it("a rephrase followed by a valid answer is accepted", async () => {
    const { bolo, engine } = make(packWith([yn]));
    bolo.queueMic({ kind: "unrecognised" }, { kind: "keyword", word: "yes", confidence: 1 });
    bolo.emitCardIn("test");
    await settle();
    expect(bolo.openMicCalls).toBe(2);
    expect(bolo.said).toContain("ynY");
    engine.dispose();
  });
});

describe("passive run of real Twycross content", () => {
  it("a completely passive child still gets the full core stack", async () => {
    const pack = loadPack(packJson);
    const { bolo, engine, hooks } = make(pack);
    bolo.emitCardIn("bonobo");
    await settle(90000);
    const bonobo = pack.cards.find((c) => c.id === "bonobo")!;
    const coreIds = bonobo.core.map((b) => b.id);
    for (const id of coreIds) expect(hooks.beatsHeard).toContain(id);
    // Only the two input beats (energy, yesNo) open the mic; silence never retries.
    expect(bolo.openMicCalls).toBe(2);
    engine.dispose();
  });
});
