import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getBolo, getSimBolo } from "../bolo";
import type { BoloDevice } from "../bolo/BoloDevice";
import type { Pack } from "../content/schema";
import { CATALOGUE, type CatalogueEntry } from "../content/catalogue";
import { loadOwnedPacks } from "../content/registry";
import { BeatEngine, SYSTEM_LINES, type EngineState } from "../visit/beats";
import { useStore } from "../store";
import { putPhoto } from "../storage/blobs";
import { useNav } from "./router";
import { useHydrated } from "./useHydrated";

/**
 * Boots the prototype and holds the always-on machinery: the catalogue, the packs
 * the family owns, the Bolo device, and a beat engine that recognises any card from
 * any owned pack. There is no session — the engine listens the whole time and the
 * ambient Today collects what the child plays.
 */

type AppValue = {
  catalogue: CatalogueEntry[];
  ownedPacks: Pack[];
  device: BoloDevice;
  engineState: EngineState;
  getPack(id: string): Pack | null;
  packForCard(cardId: string): Pack | null;
  primaryPack(): Pack | null;
  capturePhoto(blob: Blob): Promise<void>;
};

const IDLE: EngineState = {
  status: "idle",
  plainLabel: "No card in Bolo's rucksack. Pop one in to begin.",
  micRemainingMs: 0,
  taps: [],
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const nav = useNav();
  const navRef = useRef(nav.navigate);
  navRef.current = nav.navigate;

  const device = useMemo(() => getBolo(), []);
  const [engineState, setEngineState] = useState<EngineState>(IDLE);
  const engineRef = useRef<BeatEngine | null>(null);

  const ownedPackIds = useStore((s) => s.ownedPackIds);
  const gapMs = useStore((s) => s.settings.gapMs);
  const muted = useStore((s) => s.settings.muted);
  const volumeCeiling = useStore((s) => s.settings.volumeCeiling);
  const ensureToday = useStore((s) => s.ensureToday);

  // Owned packs that actually have playable content.
  const ownedPacks = useMemo(() => loadOwnedPacks(ownedPackIds), [ownedPackIds]);
  const ownedKey = ownedPacks.map((p) => p.id).join(",");

  // Roll over / create Today once persistence has settled.
  useEffect(() => {
    if (hydrated) ensureToday();
  }, [hydrated, ensureToday]);

  // (Re)build the engine whenever the owned playable set changes.
  useEffect(() => {
    getSimBolo()?.setManifest(
      { ...mergeAudio(ownedPacks), ...SYSTEM_LINES },
      mergeVocab(ownedPacks)
    );
    const engine = new BeatEngine(device, ownedPacks, {
      onBeatHeard: (cardId, beatId) =>
        useStore.getState().recordBeatHeard(cardId, beatId),
      onLearned: (line) => useStore.getState().recordLearned(line),
      onBadge: (badgeId) => useStore.getState().recordBadge(badgeId),
      requestCamera: () => navRef.current("camera"),
    });
    engineRef.current = engine;
    const unsub = engine.subscribe(setEngineState);
    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedKey, device]);

  useEffect(() => {
    const sim = getSimBolo();
    sim?.setMuted(muted);
    sim?.setVolumeCeiling(volumeCeiling);
    engineRef.current?.setGapMs(gapMs);
  }, [muted, volumeCeiling, gapMs]);

  const value = useMemo<AppValue>(() => {
    const getPack = (id: string) => ownedPacks.find((p) => p.id === id) ?? null;
    const packForCard = (cardId: string) =>
      ownedPacks.find((p) => p.cards.some((c) => c.id === cardId)) ?? null;
    return {
      catalogue: CATALOGUE,
      ownedPacks,
      device,
      engineState,
      getPack,
      packForCard,
      primaryPack: () => {
        const played = useStore.getState().today?.cardsPlayed ?? [];
        for (let i = played.length - 1; i >= 0; i--) {
          const pack = packForCard(played[i].cardId);
          if (pack) return pack;
        }
        return ownedPacks[0] ?? null;
      },
      capturePhoto: async (blob: Blob) => {
        const req = engineRef.current?.getState().photoRequest;
        const key = await putPhoto(blob);
        useStore.getState().recordPhoto({
          blobKey: key,
          cardId: req?.cardId ?? engineRef.current?.getState().cardId ?? "",
          prompt: req?.prompt ?? "",
          at: new Date().toISOString(),
        });
        engineRef.current?.submitPhoto(key);
      },
    };
  }, [ownedPacks, device, engineState]);

  if (!hydrated) return <div className="app-frame" />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function mergeAudio(packs: Pack[]): Record<string, string> {
  return Object.assign({}, ...packs.map((p) => p.audio));
}

function mergeVocab(packs: Pack[]): string[] {
  return [...new Set(packs.flatMap((p) => p.vocabulary))];
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
