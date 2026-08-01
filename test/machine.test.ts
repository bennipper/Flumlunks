import { describe, expect, it } from "vitest";
import { dayKey, newVisit } from "../src/visit/machine";

describe("Today visit (BUILD.md §8, revised)", () => {
  it("newVisit keeps only a first name and no other identifier", () => {
    const v = newVisit({ childFirstName: "  Ada " });
    expect(v.childFirstName).toBe("Ada");
    expect(v.badges).toEqual([]);
    expect(v.photos).toEqual([]);
    expect(v.day).toBe(dayKey());
    expect(Object.keys(v)).not.toContain("surname");
  });

  it("omits the first name when it is blank", () => {
    const v = newVisit({ childFirstName: "   " });
    expect(v.childFirstName).toBeUndefined();
  });

  it("dayKey is a stable local YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 7, 1))).toBe("2026-08-01");
    expect(dayKey(new Date(2026, 11, 9))).toBe("2026-12-09");
  });
});
