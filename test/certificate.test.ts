import { describe, expect, it } from "vitest";
import {
  certificateModel,
  certificateStrings,
} from "../src/output/certificate";
import { pickTitle } from "../src/output/titles";
import { loadPack } from "../src/content/loader";
import packJson from "../src/content/packs/twycross/pack.json";
import type { Visit } from "../src/visit/machine";

const pack = loadPack(packJson);

function visitWith(overrides: Partial<Visit>): Visit {
  return {
    id: "v1",
    packId: "twycross",
    packVersion: pack.version,
    startedAt: "2026-08-01T09:00:00.000Z",
    endedAt: "2026-08-01T15:00:00.000Z",
    cardsPlayed: [],
    photos: [],
    badges: [],
    learned: [],
    ...overrides,
  };
}

// A count, fraction or percentage in any rendered string (BUILD.md §14).
const FORBIDDEN = [/%/, /\d+\s*\/\s*\d+/, /\b\d+\s+of\s+\d+\b/];

describe("certificate", () => {
  it("never renders a count, a fraction or a percentage", () => {
    const visit = visitWith({
      childFirstName: "Rosa",
      badges: ["bonobo-badge", "gorilla-badge"],
      learned: [
        "Bonobos share their food to keep everyone calm.",
        "A big gorilla with a silver back is the one in charge.",
        "Gibbons have the longest arms of any ape.",
      ],
    });
    const strings = certificateStrings(certificateModel(visit, pack));
    for (const s of strings) {
      for (const pattern of FORBIDDEN) {
        expect(s, `"${s}" must not contain a count/fraction/percentage`).not.toMatch(
          pattern
        );
      }
    }
  });

  it("a two-badge visit reads as a full win with a real title", () => {
    const title = pickTitle(["bonobo-badge", "gorilla-badge"], pack);
    expect(title).toBe("Chief Ape Watcher");
    expect(title).not.toMatch(/\d/);
  });

  it("learned[] yields three distinct lines", () => {
    const visit = visitWith({
      learned: [
        "Bonobos share their food to keep everyone calm.",
        "A giraffe's tongue is longer than my whole arm.",
        "Penguins can't fly in the air but they fly through the water.",
      ],
    });
    const model = certificateModel(visit, pack);
    expect(model.learned).toHaveLength(3);
    expect(new Set(model.learned).size).toBe(3);
  });

  it("uses a long-form date with no slashes", () => {
    const model = certificateModel(visitWith({}), pack);
    expect(model.dateText).not.toMatch(/\//);
    expect(model.dateText).toMatch(/August/);
  });
});
