import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", async () => (await import("./helpers/idbMock")).idbMock());

import {
  CATALOGUE,
  CATEGORY_ORDER,
  parseUnlockPayload,
  SHOP_BASE,
} from "../src/content/catalogue";
import { isBundled } from "../src/content/registry";
import { useStore } from "../src/store";

describe("catalogue", () => {
  it("covers every category and has a unique code + shop link per pack", () => {
    const cats = new Set(CATALOGUE.map((e) => e.category));
    for (const c of CATEGORY_ORDER) expect(cats.has(c)).toBe(true);

    const codes = CATALOGUE.map((e) => e.unlockCode.toUpperCase());
    expect(new Set(codes).size).toBe(codes.length);

    for (const e of CATALOGUE) expect(e.buyUrl.startsWith(SHOP_BASE)).toBe(true);
  });

  it("marks Twycross as the one bundled, playable pack", () => {
    expect(isBundled("twycross")).toBe(true);
    expect(CATALOGUE.find((e) => e.id === "twycross")?.bundled).toBe(true);
  });
});

describe("parseUnlockPayload", () => {
  it("accepts the raw code, URI forms and the pack id", () => {
    expect(parseUnlockPayload("TWYCROSS")).toBe("twycross");
    expect(parseUnlockPayload("twycross")).toBe("twycross");
    expect(parseUnlockPayload("  hola ")).toBe("hello-spanish");
    expect(parseUnlockPayload("flumlunk:unlock:TWYCROSS")).toBe("twycross");
    expect(parseUnlockPayload("flumlunk://unlock/NUMBERS")).toBe("first-numbers");
  });

  it("returns null for anything unrecognised", () => {
    expect(parseUnlockPayload("")).toBeNull();
    expect(parseUnlockPayload("NOPE")).toBeNull();
    expect(parseUnlockPayload("http://evil.example/x")).toBeNull();
  });
});

describe("unlock entitlements", () => {
  beforeEach(() => {
    useStore.setState({ ownedPackIds: [], downloadedPackIds: [] });
  });

  it("owning a pack also caches it for offline, and is idempotent", () => {
    useStore.getState().unlockPack("twycross");
    useStore.getState().unlockPack("twycross");
    expect(useStore.getState().ownedPackIds).toEqual(["twycross"]);
    expect(useStore.getState().downloadedPackIds).toEqual(["twycross"]);
  });
});
