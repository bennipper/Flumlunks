import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * A tiny hash router. No dependency (BUILD.md §3 asks before adding any), and hash
 * routing works when the prototype is opened over the local network on a phone
 * without server-side route handling.
 */

export type Route =
  | "start"
  | "live"
  | "camera"
  | "cards"
  | "certificate"
  | "settings";

const ROUTES: Route[] = ["start", "live", "camera", "cards", "certificate", "settings"];

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : "start";
}

type Nav = { route: Route; navigate: (r: Route) => void };
const NavContext = createContext<Nav | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(readHash);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const value = useMemo<Nav>(
    () => ({
      route,
      navigate: (r) => {
        window.location.hash = `/${r}`;
      },
    }),
    [route]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside RouterProvider");
  return ctx;
}
