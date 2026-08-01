/**
 * Visit state machine (BUILD.md §8).
 *
 *   IDLE ──startVisit──▶ ACTIVE ──endVisit──▶ COMPOSING ──▶ COMPLETE
 *
 * That's it. No exhibit selection, no positioning, no per-exhibit states. The card
 * drives everything and the beat engine owns its own sub-state. This module holds
 * the Visit shape and pure transition helpers; the Zustand store (src/store.ts)
 * wires them to persistence.
 */

export type VisitPhase = "idle" | "active" | "composing" | "complete";

export type PlayedCard = { cardId: string; beatsHeard: string[]; at: string };
export type VisitPhoto = {
  blobKey: string;
  cardId: string;
  prompt: string;
  at: string;
};

export type Visit = {
  id: string;
  packId: string;
  packVersion: string;
  childFirstName?: string;
  startedAt: string;
  endedAt?: string;
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

export function newVisit(args: {
  packId: string;
  packVersion: string;
  childFirstName?: string;
}): Visit {
  return {
    id: uid(),
    packId: args.packId,
    packVersion: args.packVersion,
    childFirstName: args.childFirstName?.trim() || undefined,
    startedAt: new Date().toISOString(),
    cardsPlayed: [],
    photos: [],
    badges: [],
    learned: [],
  };
}

export function canTransition(from: VisitPhase, to: VisitPhase): boolean {
  const allowed: Record<VisitPhase, VisitPhase[]> = {
    idle: ["active"],
    active: ["composing"],
    composing: ["complete"],
    complete: ["idle"],
  };
  return allowed[from].includes(to);
}
