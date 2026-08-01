import { useEffect, useState } from "react";
import { useStore } from "../store";

/**
 * True once the persisted store has finished rehydrating from IndexedDB. Rendering
 * waits on this so a resumable Today isn't flashed over by default state.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}
