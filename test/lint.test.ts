import { describe, expect, it } from "vitest";
import { lintPack } from "../src/content/lint";
import type { Beat, Pack } from "../src/content/schema";
import { loadPack } from "../src/content/loader";
import packJson from "../src/content/packs/twycross/pack.json";

/** A pack that lints clean, used as the base for one failing fixture per rule. */
function basePack(): Pack {
  return {
    id: "twycross",
    version: "test",
    venueName: "Twycross Zoo",
    approvedBy: "A Ranger",
    approvedAt: "2026-01-01T00:00:00.000Z",
    vocabulary: ["yes", "no", "one", "two", "three", "quiet"],
    cards: [
      {
        id: "c1",
        animal: "Bonobo",
        zone: "Bonobo Forest",
        noiseSensitive: false,
        core: [
          { kind: "recognition", id: "r", audioId: "r" },
          { kind: "fact", id: "f", audioId: "f", learnedLine: "I learned a thing." },
        ],
        deep: [],
      },
    ],
    badges: [],
    audio: { r: "You found the bonobos.", f: "Bonobos share food." },
  };
}

function has(pack: Pack, rule: string): boolean {
  return lintPack(pack).some((p) => p.rule === rule);
}

describe("pack linter — one failing fixture per rule", () => {
  it("the real Twycross pack and the base fixture lint clean", () => {
    expect(lintPack(loadPack(packJson))).toEqual([]);
    expect(lintPack(basePack())).toEqual([]);
  });

  it("loud energy beat on a noiseSensitive card", () => {
    const p = basePack();
    p.cards[0].noiseSensitive = true;
    p.cards[0].core.push({
      kind: "energy", id: "e", audioId: "e", mode: "loud", threshold: 0.7, successAudioId: "eS",
    });
    p.audio.e = "Give me a roar.";
    p.audio.eS = "Great roar.";
    expect(has(p, "loud-near-primates")).toBe(true);
  });

  it("an expected answer outside the vocabulary", () => {
    const p = basePack();
    p.cards[0].core.push({ kind: "signHunt", id: "sh", audioId: "sh", word: "elephant" });
    p.audio.sh = "Find the sign. Say elephant.";
    expect(has(p, "out-of-vocabulary")).toBe(true);
  });

  it("a choice beat that names options instead of numbers", () => {
    const p = basePack();
    p.cards[0].core.push({
      kind: "choice", id: "ch", audioId: "ch", options: 2, correct: 1,
      correctAudioId: "chC", wrongAudioId: "chW",
    });
    p.audio.ch = "Press the green button or the red button.";
    p.audio.chC = "Right.";
    p.audio.chW = "Not quite.";
    expect(has(p, "choice-names-options")).toBe(true);
  });

  it("an open question mark in a transcript", () => {
    const p = basePack();
    (p.cards[0].core[0] as Extract<Beat, { kind: "recognition" }>).audioId = "r";
    p.audio.r = "Why do bonobos share?";
    expect(has(p, "open-question")).toBe(true);
  });

  it("a lookFor beat with no notVisibleAudioId", () => {
    const p = basePack();
    p.cards[0].core.push({
      kind: "lookFor", id: "l", audioId: "l", notVisibleAudioId: "",
    });
    p.audio.l = "Look for one sitting close.";
    expect(has(p, "lookfor-missing-notvisible")).toBe(true);
  });

  it("a card with no fact beat", () => {
    const p = basePack();
    p.cards[0].core = [{ kind: "recognition", id: "r", audioId: "r" }];
    expect(has(p, "card-missing-fact")).toBe(true);
  });

  it("a fact beat with no learnedLine", () => {
    const p = basePack();
    (p.cards[0].core[1] as Extract<Beat, { kind: "fact" }>).learnedLine = "";
    expect(has(p, "fact-missing-learnedline")).toBe(true);
  });

  it("a named individual animal in a transcript", () => {
    const p = basePack();
    p.audio.r = "Say hello to Kianga the bonobo.";
    expect(has(p, "named-individual")).toBe(true);
  });

  it("an audioId with no manifest entry", () => {
    const p = basePack();
    p.cards[0].core.push({ kind: "recognition", id: "ghost", audioId: "ghost" });
    expect(has(p, "missing-audio")).toBe(true);
  });

  it("missing approvedBy or approvedAt", () => {
    const p = basePack();
    p.approvedBy = "";
    expect(has(p, "approval")).toBe(true);
    const p2 = basePack();
    p2.approvedAt = "";
    expect(has(p2, "approval")).toBe(true);
  });
});
