import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del, createStore } from "idb-keyval";
import {
  newVisit,
  type Visit,
  type VisitPhase,
  type VisitPhoto,
} from "./visit/machine";
import { clearAllPhotos } from "./storage/blobs";

/**
 * The single source of truth. All state is local (hard rule §1): persisted to
 * IndexedDB via idb-keyval, never uploaded. A visit is resumable across a page
 * reload (BUILD.md §8).
 */

export type Settings = {
  childFirstName: string;
  /** 0..1 ceiling applied to all Bolo audio. */
  volumeCeiling: number;
  muted: boolean;
  /** Silence after each beat, ms. Dev-tunable (BUILD.md §7). */
  gapMs: number;
};

type StoreState = {
  phase: VisitPhase;
  visit: Visit | null;
  settings: Settings;

  startVisit(args: { packId: string; packVersion: string }): void;
  endVisit(): void;
  complete(): void;
  resetToIdle(): void;

  recordBeatHeard(cardId: string, beatId: string): void;
  recordPhoto(photo: VisitPhoto): void;
  recordBadge(badgeId: string): void;
  recordLearned(line: string): void;

  updateSettings(patch: Partial<Settings>): void;
  deleteEverything(): Promise<void>;
};

const idbStore = createStore("flumlunk-state", "kv");

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name, idbStore)) ?? null,
  setItem: async (name, value) => set(name, value, idbStore),
  removeItem: async (name) => del(name, idbStore),
};

const DEFAULT_SETTINGS: Settings = {
  childFirstName: "",
  volumeCeiling: 0.85,
  muted: false,
  gapMs: 4000,
};

export const useStore = create<StoreState>()(
  persist(
    (setState, getState) => ({
      phase: "idle",
      visit: null,
      settings: DEFAULT_SETTINGS,

      startVisit: ({ packId, packVersion }) => {
        const { settings } = getState();
        setState({
          phase: "active",
          visit: newVisit({
            packId,
            packVersion,
            childFirstName: settings.childFirstName,
          }),
        });
      },

      endVisit: () => {
        const { visit } = getState();
        if (!visit) return;
        setState({
          phase: "composing",
          visit: { ...visit, endedAt: new Date().toISOString() },
        });
      },

      complete: () => setState({ phase: "complete" }),

      resetToIdle: () => setState({ phase: "idle", visit: null }),

      recordBeatHeard: (cardId, beatId) => {
        const { visit } = getState();
        if (!visit) return;
        const cardsPlayed = [...visit.cardsPlayed];
        const idx = cardsPlayed.findIndex((c) => c.cardId === cardId);
        if (idx === -1) {
          cardsPlayed.push({
            cardId,
            beatsHeard: [beatId],
            at: new Date().toISOString(),
          });
        } else if (!cardsPlayed[idx].beatsHeard.includes(beatId)) {
          cardsPlayed[idx] = {
            ...cardsPlayed[idx],
            beatsHeard: [...cardsPlayed[idx].beatsHeard, beatId],
          };
        }
        setState({ visit: { ...visit, cardsPlayed } });
      },

      recordPhoto: (photo) => {
        const { visit } = getState();
        if (!visit) return;
        setState({ visit: { ...visit, photos: [...visit.photos, photo] } });
      },

      recordBadge: (badgeId) => {
        const { visit } = getState();
        if (!visit || visit.badges.includes(badgeId)) return;
        setState({ visit: { ...visit, badges: [...visit.badges, badgeId] } });
      },

      recordLearned: (line) => {
        const { visit } = getState();
        if (!visit || visit.learned.includes(line)) return;
        setState({ visit: { ...visit, learned: [...visit.learned, line] } });
      },

      updateSettings: (patch) =>
        setState({ settings: { ...getState().settings, ...patch } }),

      deleteEverything: async () => {
        await clearAllPhotos();
        setState({ phase: "idle", visit: null, settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "flumlunk-visit",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        phase: s.phase,
        visit: s.visit,
        settings: s.settings,
      }),
    }
  )
);
