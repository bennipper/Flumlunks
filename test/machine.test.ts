import { describe, expect, it } from "vitest";
import { canTransition, newVisit } from "../src/visit/machine";

describe("visit state machine (BUILD.md §8)", () => {
  it("allows only the linear IDLE→ACTIVE→COMPOSING→COMPLETE→IDLE path", () => {
    expect(canTransition("idle", "active")).toBe(true);
    expect(canTransition("active", "composing")).toBe(true);
    expect(canTransition("composing", "complete")).toBe(true);
    expect(canTransition("complete", "idle")).toBe(true);

    expect(canTransition("idle", "composing")).toBe(false);
    expect(canTransition("active", "complete")).toBe(false);
    expect(canTransition("composing", "active")).toBe(false);
  });

  it("newVisit keeps only a first name and no other identifier", () => {
    const v = newVisit({ packId: "twycross", packVersion: "1", childFirstName: "  Ada " });
    expect(v.childFirstName).toBe("Ada");
    expect(v.badges).toEqual([]);
    expect(v.photos).toEqual([]);
    expect(Object.keys(v)).not.toContain("surname");
  });

  it("omits the first name when it is blank", () => {
    const v = newVisit({ packId: "twycross", packVersion: "1", childFirstName: "   " });
    expect(v.childFirstName).toBeUndefined();
  });
});
