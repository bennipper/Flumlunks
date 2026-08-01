import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del, createStore } from "idb-keyval";
import { dayKey, newVisit, type Visit, type VisitPhoto } from "./visit/machine";
import { clearAllPhotos } from "./storage/blobs";

/**
 * The single source of truth. All state is local (hard rule §1): persisted to
 * IndexedDB via idb-keyval, never uploaded.
 *
 * Two kinds of state: entitlements (which packs you own / have downloaded, unlocked
 * by scanning the QR inside physical cards) and the ambient Today the child fills by
 * playing cards. There is no session to start or end.
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
  ownedPackIds: string[];
  downloadedPackIds: string[];
  today: Visit | null;
  settings: Settings;
  /** Ephemeral UI selection (which pack a sub-screen is showing). Not persisted. */
  selectedPackId: string | null;

  // entitlements
  unlockPack(packId: string): void;
  selectPack(packId: string | null): void;

  // today
  ensureToday(): void;
  startNewDay(): void;
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
      ownedPackIds: [],
      downloadedPackIds: [],
      today: null,
      settings: DEFAULT_SETTINGS,
      selectedPackId: null,

      unlockPack: (packId) => {
        const s = getState();
        const owned = s.ownedPackIds.includes(packId)
          ? s.ownedPackIds
          : [...s.ownedPackIds, packId];
        // Unlocking a pack also caches its content for offline use (simulated here).
        const downloaded = s.downloadedPackIds.includes(packId)
          ? s.downloadedPackIds
          : [...s.downloadedPackIds, packId];
        setState({ ownedPackIds: owned, downloadedPackIds: downloaded });
      },

      selectPack: (packId) => setState({ selectedPackId: packId }),

      ensureToday: () => {
        const { today } = getState();
        const key = dayKey();
        if (today && today.day === key) return;
        // Missing or from a previous day → roll over to a fresh Today.
        setState({
          today: newVisit({ childFirstName: getState().settings.childFirstName }),
        });
      },

      startNewDay: () => {
        setState({
          today: newVisit({ childFirstName: getState().settings.childFirstName }),
        });
      },

      recordBeatHeard: (cardId, beatId) => {
        const { today } = getState();
        if (!today) return;
        const cardsPlayed = [...today.cardsPlayed];
        const idx = cardsPlayed.findIndex((c) => c.cardId === cardId);
        if (idx === -1) {
          cardsPlayed.push({ cardId, beatsHeard: [beatId], at: new Date().toISOString() });
        } else if (!cardsPlayed[idx].beatsHeard.includes(beatId)) {
          cardsPlayed[idx] = {
            ...cardsPlayed[idx],
            beatsHeard: [...cardsPlayed[idx].beatsHeard, beatId],
          };
        }
        setState({ today: { ...today, cardsPlayed } });
      },

      recordPhoto: (photo) => {
        const { today } = getState();
        if (!today) return;
        setState({ today: { ...today, photos: [...today.photos, photo] } });
      },

      recordBadge: (badgeId) => {
        const { today } = getState();
        if (!today || today.badges.includes(badgeId)) return;
        setState({ today: { ...today, badges: [...today.badges, badgeId] } });
      },

      recordLearned: (line) => {
        const { today } = getState();
        if (!today || today.learned.includes(line)) return;
        setState({ today: { ...today, learned: [...today.learned, line] } });
      },

      updateSettings: (patch) =>
        setState({ settings: { ...getState().settings, ...patch } }),

      deleteEverything: async () => {
        await clearAllPhotos();
        setState({
          ownedPackIds: [],
          downloadedPackIds: [],
          today: null,
          selectedPackId: null,
          settings: DEFAULT_SETTINGS,
        });
      },
    }),
    {
      name: "flumlunk-visit",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        ownedPackIds: s.ownedPackIds,
        downloadedPackIds: s.downloadedPackIds,
        today: s.today,
        settings: s.settings,
      }),
    }
  )
);
