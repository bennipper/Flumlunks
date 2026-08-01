import type { Badge, Pack } from "../content/schema";

/**
 * Certificate titles (BUILD.md §10). Titles vary by achievement, never by rank.
 * Two badges earns a real title, not a lesser one. Never a count, never a
 * percentage, never an empty slot. Every branch returns a title a zoo would
 * actually print.
 */

const APES = new Set(["bonobo-badge", "gorilla-badge", "gibbon-badge"]);
const BIG_CATS = new Set(["amur-badge", "snow-badge"]);

export function pickTitle(badgeIds: string[], _pack: Pack): string {
  const set = new Set(badgeIds);
  const apes = [...set].filter((b) => APES.has(b)).length;
  const cats = [...set].filter((b) => BIG_CATS.has(b)).length;
  const total = set.size;

  if (apes >= 2) return "Chief Ape Watcher";
  if (apes === 1 && total >= 2) return "Junior Keeper";
  if (apes === 1) return "Primate Spotter";
  if (cats >= 2) return "Big Cat Tracker";
  if (cats === 1 && total >= 2) return "Junior Keeper";
  if (cats === 1) return "Big Cat Spotter";
  if (total >= 2) return "Junior Keeper";
  if (total === 1) return "Animal Friend";
  return "Twycross Explorer";
}

export function badgesFor(badgeIds: string[], pack: Pack): Badge[] {
  return badgeIds
    .map((id) => pack.badges.find((b) => b.id === id))
    .filter((b): b is Badge => Boolean(b));
}
