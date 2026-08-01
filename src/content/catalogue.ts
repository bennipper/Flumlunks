/**
 * Pack catalogue — the browse/preview surface (parent's request). Every pack the
 * range offers appears here as metadata, whether or not its full content is on the
 * device yet. Owning a pack happens by scanning the QR inside its physical cards
 * (see entitlements in the store); this file is just the shop window and the code
 * that maps a scanned/typed unlock code to a pack.
 *
 * Consistent with the hard rules (BUILD.md §2): the catalogue is static content, the
 * "buy" action is an outbound link to an external shop (a plain navigation, no
 * payment SDK, no backend), and nothing here uploads anything.
 */

export type PackCategory = "days-out" | "learning" | "maths" | "languages";

export const CATEGORY_LABELS: Record<PackCategory, string> = {
  "days-out": "Days out",
  learning: "Learning",
  maths: "Maths",
  languages: "Languages",
};

export const CATEGORY_ORDER: PackCategory[] = [
  "days-out",
  "learning",
  "maths",
  "languages",
];

/** Base of the external shop. Reserved example domain — never a real storefront. */
export const SHOP_BASE = "https://shop.flumlunk.example";

export type CatalogueEntry = {
  id: string;
  title: string;
  subtitle: string;
  category: PackCategory;
  /** Enamel cover colour — never --brass (badges only) or --signal (actions only). */
  coverColour: string;
  coverMotif: string;
  cardCount: number;
  previewLine: string;
  /** The human code the card's QR encodes; also typeable as a fallback. */
  unlockCode: string;
  buyUrl: string;
  /** True when the full content ships in the app (playable once unlocked). */
  bundled: boolean;
};

const shop = (slug: string) => `${SHOP_BASE}/${slug}`;

export const CATALOGUE: CatalogueEntry[] = [
  {
    id: "twycross",
    title: "Twycross Zoo",
    subtitle: "A day with Bolo",
    category: "days-out",
    coverColour: "#0F5C3F",
    coverMotif: "🦍",
    cardCount: 8,
    previewLine: "You found the bonobos. Good spotting. Let's watch them together.",
    unlockCode: "TWYCROSS",
    buyUrl: shop("twycross"),
    bundled: true,
  },
  {
    id: "bramblewood",
    title: "Bramblewood Farm Park",
    subtitle: "Meet the farm animals",
    category: "days-out",
    coverColour: "#10261E",
    coverMotif: "🐴",
    cardCount: 10,
    previewLine: "You found the goats. Watch how they climb — they love to be up high.",
    unlockCode: "BRAMBLEWOOD",
    buyUrl: shop("bramblewood"),
    bundled: false,
  },
  {
    id: "minibeasts",
    title: "Minibeasts & Bugs",
    subtitle: "Tiny creatures in the garden",
    category: "learning",
    coverColour: "#0A3F2B",
    coverMotif: "🐛",
    cardCount: 12,
    previewLine: "A ladybird has spots. Can you find one hiding on a leaf?",
    unlockCode: "MINIBEASTS",
    buyUrl: shop("minibeasts"),
    bundled: false,
  },
  {
    id: "first-numbers",
    title: "First Numbers",
    subtitle: "Counting with Bolo",
    category: "maths",
    coverColour: "#0F5C3F",
    coverMotif: "①",
    cardCount: 10,
    previewLine: "Let's count the apples together. Ready? One… two… three.",
    unlockCode: "NUMBERS",
    buyUrl: shop("first-numbers"),
    bundled: false,
  },
  {
    id: "hello-spanish",
    title: "Hello Spanish",
    subtitle: "First words with Bolo",
    category: "languages",
    coverColour: "#5C6B63",
    coverMotif: "¡",
    cardCount: 12,
    previewLine: "In Spanish, hello is hola. Can you say it back to me? Hola!",
    unlockCode: "HOLA",
    buyUrl: shop("hello-spanish"),
    bundled: false,
  },
];

export function entryById(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((e) => e.id === id);
}

export function byCategory(category: PackCategory): CatalogueEntry[] {
  return CATALOGUE.filter((e) => e.category === category);
}

/**
 * Resolve a scanned or typed unlock payload to a pack id. Accepts the raw code
 * ("TWYCROSS"), a URI form ("flumlunk:unlock:TWYCROSS" / "flumlunk://unlock/TWYCROSS"),
 * or the pack id itself. Returns null if nothing matches.
 */
export function parseUnlockPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let code = trimmed;
  const uri = trimmed.match(/^flumlunk:(?:\/\/)?unlock[:/](.+)$/i);
  if (uri) code = uri[1].trim();

  const upper = code.toUpperCase();
  const byCode = CATALOGUE.find((e) => e.unlockCode.toUpperCase() === upper);
  if (byCode) return byCode.id;

  const byId = CATALOGUE.find((e) => e.id.toLowerCase() === code.toLowerCase());
  return byId ? byId.id : null;
}
