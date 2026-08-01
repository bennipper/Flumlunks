import { useNav } from "./app/router";
import { DashboardScreen } from "./screens/DashboardScreen";
import { StoreScreen } from "./screens/StoreScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { CardsScreen } from "./screens/CardsScreen";
import { CameraScreen } from "./screens/CameraScreen";
import { CertificateScreen } from "./screens/CertificateScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { DebugPanel } from "./bolo/DebugPanel";

/**
 * App shell. The dashboard is the home and menu; there is no session to start, so
 * routing is driven purely by the hash route (BUILD.md §8, revised). The beat engine
 * runs continuously in AppContext, listening for cards the whole time.
 */
export function App() {
  const { route } = useNav();

  const screen =
    route === "store" ? (
      <StoreScreen />
    ) : route === "scan" ? (
      <ScanScreen />
    ) : route === "library" ? (
      <LibraryScreen />
    ) : route === "cards" ? (
      <CardsScreen />
    ) : route === "camera" ? (
      <CameraScreen />
    ) : route === "certificate" ? (
      <CertificateScreen />
    ) : route === "settings" ? (
      <SettingsScreen />
    ) : (
      <DashboardScreen />
    );

  return (
    <div className="app-frame">
      {screen}
      {import.meta.env.DEV && route !== "camera" && <DebugPanel />}
    </div>
  );
}
