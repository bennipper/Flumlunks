import { loadPack, PackError } from "./loader";
import type { Pack } from "./schema";
import twycrossJson from "./packs/twycross/pack.json";

/**
 * Registry of bundled pack content. In the real app a pack's audio + JSON is
 * downloaded and cached the first time you unlock it (BUILD.md §1) so it works
 * offline on a day out; in this prototype the content ships in the bundle. Only
 * packs listed here are playable — everything else in the catalogue is preview-only
 * until its cards (and content) exist.
 */

const RAW: Record<string, unknown> = {
  twycross: twycrossJson,
};

const cache = new Map<string, Pack>();

export function isBundled(id: string): boolean {
  return id in RAW;
}

export function getBundledPack(id: string): Pack | null {
  if (!isBundled(id)) return null;
  const cached = cache.get(id);
  if (cached) return cached;
  const pack = loadPack(RAW[id]);
  cache.set(id, pack);
  return pack;
}

/** Load every owned pack that has bundled content, skipping any that fail to load. */
export function loadOwnedPacks(ownedIds: string[]): Pack[] {
  const packs: Pack[] = [];
  for (const id of ownedIds) {
    if (!isBundled(id)) continue;
    try {
      const pack = getBundledPack(id);
      if (pack) packs.push(pack);
    } catch (e) {
      // A pack that fails validation is simply not offered (BUILD.md §6).
      if (!(e instanceof PackError)) throw e;
    }
  }
  return packs;
}
