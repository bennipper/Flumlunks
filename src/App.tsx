import { useEffect, useState } from "react";
import { useNav } from "./app/router";
import { useStore } from "./store";
import { StartScreen } from "./screens/StartScreen";
import { LiveScreen } from "./screens/LiveScreen";
import { CameraScreen } from "./screens/CameraScreen";
import { CardsScreen } from "./screens/CardsScreen";
import { CertificateScreen } from "./screens/CertificateScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TabBar } from "./components/ui";
import { DebugPanel } from "./bolo/DebugPanel";

/**
 * App shell. The visit phase (BUILD.md §8) decides which screens are reachable; the
 * hash route decides which of the active-phase screens is shown. Persistence
 * rehydrates asynchronously, so we hold rendering until it finishes to avoid a flash
 * of the Start screen over a resumable visit.
 */
function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

export function App() {
  const hydrated = useHydrated();
  const phase = useStore((s) => s.phase);
  const { route } = useNav();

  if (!hydrated) return <div className="app-frame" />;

  if (phase === "idle") {
    return (
      <div className="app-frame">
        <StartScreen />
      </div>
    );
  }

  if (phase === "composing" || phase === "complete") {
    return (
      <div className="app-frame">
        <CertificateScreen />
      </div>
    );
  }

  // Active visit.
  const screen =
    route === "camera" ? (
      <CameraScreen />
    ) : route === "cards" ? (
      <CardsScreen />
    ) : route === "settings" ? (
      <SettingsScreen />
    ) : (
      <LiveScreen />
    );

  return (
    <div className="app-frame">
      {screen}
      {route !== "camera" && <TabBar />}
      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
