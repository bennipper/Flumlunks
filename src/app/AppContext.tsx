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
import { loadPack } from "../content/loader";
import type { Pack } from "../content/schema";
import packJson from "../content/packs/twycross/pack.json";
import { BeatEngine, SYSTEM_LINES, type EngineState } from "../visit/beats";
import { useStore } from "../store";
import { putPhoto } from "../storage/blobs";
import { useNav } from "./router";

/**
 * Boots the prototype: validates the pack, wires the Bolo device and the beat
 * engine to the store, and hands both down to the screens. If the pack is
 * malformed it is refused here and the app renders the error rather than running
 * bad content (BUILD.md §6).
 */

type AppValue = {
  pack: Pack | null;
  packError: string[] | null;
  device: BoloDevice;
  engine: BeatEngine;
  engineState: EngineState;
  capturePhoto(blob: Blob): Promise<void>;
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const nav = useNav();
  const navRef = useRef(nav.navigate);
  navRef.current = nav.navigate;

  const [pack, packError] = useMemo<[Pack | null, string[] | null]>(() => {
    try {
      return [loadPack(packJson), null];
    } catch (e) {
      const problems =
        e && typeof e === "object" && "problems" in e
          ? ((e as { problems: string[] }).problems ?? [])
          : [String(e)];
      return [null, problems];
    }
  }, []);

  const device = useMemo(() => getBolo(), []);
  const engineRef = useRef<BeatEngine | null>(null);
  const [engineState, setEngineState] = useState<EngineState>(() => ({
    status: "idle",
    plainLabel: "Waiting for a card. Pop one into Bolo's rucksack.",
    micRemainingMs: 0,
    taps: [],
  }));

  // Build the engine once the pack is validated.
  if (pack && !engineRef.current) {
    getSimBolo()?.setManifest({ ...pack.audio, ...SYSTEM_LINES }, pack.vocabulary);
    engineRef.current = new BeatEngine(device, pack, {
      onBeatHeard: (cardId, beatId) =>
        useStore.getState().recordBeatHeard(cardId, beatId),
      onLearned: (line) => useStore.getState().recordLearned(line),
      onBadge: (badgeId) => useStore.getState().recordBadge(badgeId),
      requestCamera: () => navRef.current("camera"),
    });
  }
  const engine = engineRef.current;

  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe(setEngineState);
    return () => {
      unsub();
    };
  }, [engine]);

  // Keep device + engine in step with settings.
  const settings = useStore((s) => s.settings);
  useEffect(() => {
    const sim = getSimBolo();
    sim?.setMuted(settings.muted);
    sim?.setVolumeCeiling(settings.volumeCeiling);
    engine?.setGapMs(settings.gapMs);
  }, [settings.muted, settings.volumeCeiling, settings.gapMs, engine]);

  useEffect(
    () => () => {
      engineRef.current?.dispose();
    },
    []
  );

  const value = useMemo<AppValue | null>(() => {
    if (!engine) return null;
    return {
      pack,
      packError,
      device,
      engine,
      engineState,
      capturePhoto: async (blob: Blob) => {
        const req = engine.getState().photoRequest;
        const key = await putPhoto(blob);
        useStore.getState().recordPhoto({
          blobKey: key,
          cardId: req?.cardId ?? engine.getState().cardId ?? "",
          prompt: req?.prompt ?? "",
          at: new Date().toISOString(),
        });
        engine.submitPhoto(key);
      },
    };
  }, [engine, pack, packError, device, engineState]);

  if (packError) {
    return (
      <div className="app-frame" style={{ padding: 24 }}>
        <h1 style={{ color: "var(--signal)" }}>Pack refused</h1>
        <p>This content pack did not pass validation, so it will not run.</p>
        <ul>
          {packError.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!value) return <div className="app-frame" />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
