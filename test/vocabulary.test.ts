import { describe, expect, it } from "vitest";
import { loadPack } from "../src/content/loader";
import packJson from "../src/content/packs/twycross/pack.json";

/**
 * BUILD.md §14: assert no beat in the Twycross pack expects an out-of-vocabulary
 * answer. Computed directly here (independently of the linter) as a second guard.
 */
describe("Twycross vocabulary", () => {
  const pack = loadPack(packJson);
  const vocab = new Set(pack.vocabulary.map((w) => w.toLowerCase()));

  it("every expected spoken answer is in the pack vocabulary", () => {
    const offenders: string[] = [];
    for (const card of pack.cards) {
      for (const beat of [...card.core, ...card.deep]) {
        const expected: string[] = [];
        if (beat.kind === "signHunt") expected.push(beat.word);
        if (beat.kind === "yesNo") expected.push("yes", "no");
        if (beat.kind === "recognition" && card.keyword) expected.push(card.keyword);
        for (const answer of expected) {
          if (!vocab.has(answer.toLowerCase())) {
            offenders.push(`${card.id}/${beat.id}: "${answer}"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("declares exactly the 25 words the pack is built around", () => {
    expect(pack.vocabulary).toHaveLength(25);
  });
});
