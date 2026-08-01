/**
 * The "Today" visit (BUILD.md §8, revised).
 *
 * There is no session ceremony any more: the child drives everything by posting
 * cards into Bolo, so the parent never "starts" or "ends" a day. Instead the app
 * keeps an ambient Today that collects badges, photos and learned lines as cards are
 * played, and rolls over to a fresh one on a new calendar day. The certificate is
 * produced on demand from Today, not gated behind an "End the day" step.
 *
 * Today is still resumable across a page reload (it is persisted), and still holds no
 * child identifier beyond an optional first name.
 */

export type PlayedCard = { cardId: string; beatsHeard: string[]; at: string };
export type VisitPhoto = {
  blobKey: string;
  cardId: string;
  prompt: string;
  at: string;
};

export type Visit = {
  id: string;
  /** Calendar day this Today belongs to, YYYY-MM-DD (local). */
  day: string;
  childFirstName?: string;
  startedAt: string;
  cardsPlayed: PlayedCard[];
  photos: VisitPhoto[];
  badges: string[];
  /** learnedLine values, for the certificate. */
  learned: string[];
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Local calendar day key, e.g. "2026-08-01". */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function newVisit(args: { childFirstName?: string; day?: string }): Visit {
  return {
    id: uid(),
    day: args.day ?? dayKey(),
    childFirstName: args.childFirstName?.trim() || undefined,
    startedAt: new Date().toISOString(),
    cardsPlayed: [],
    photos: [],
    badges: [],
    learned: [],
  };
}
