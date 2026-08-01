import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace IndexedDB with an in-memory model (jsdom has none; no new dependency).
vi.mock("idb-keyval", async () => (await import("./helpers/idbMock")).idbMock());

import {
  clearAllPhotos,
  deletePhoto,
  getPhoto,
  putPhoto,
} from "../src/storage/blobs";
import { useStore } from "../src/store";

function blob(text: string): Blob {
  return new Blob([text], { type: "image/jpeg" });
}

describe("photo blob storage", () => {
  it("stores, reads and deletes individual photos", async () => {
    const key = await putPhoto(blob("a"));
    expect(await getPhoto(key)).toBeInstanceOf(Blob);
    await deletePhoto(key);
    expect(await getPhoto(key)).toBeUndefined();
  });

  it("clears every photo blob at once", async () => {
    const k1 = await putPhoto(blob("a"));
    const k2 = await putPhoto(blob("b"));
    await clearAllPhotos();
    expect(await getPhoto(k1)).toBeUndefined();
    expect(await getPhoto(k2)).toBeUndefined();
  });
});

describe("deleteEverything (BUILD.md §8, §13 phase 8)", () => {
  beforeEach(() => {
    useStore.setState({
      phase: "idle",
      visit: null,
      settings: { childFirstName: "", volumeCeiling: 0.85, muted: false, gapMs: 4000 },
    });
  });

  it("clears all visits, photos, badges and blobs", async () => {
    const store = useStore.getState();
    store.startVisit({ packId: "twycross", packVersion: "1" });
    store.updateSettings({ childFirstName: "Mo", volumeCeiling: 0.3 });

    const key = await putPhoto(blob("photo"));
    useStore.getState().recordPhoto({
      blobKey: key, cardId: "bonobo", prompt: "Smile", at: new Date().toISOString(),
    });
    useStore.getState().recordBadge("bonobo-badge");
    useStore.getState().recordLearned("Bonobos share their food.");

    expect(useStore.getState().visit?.photos).toHaveLength(1);

    await useStore.getState().deleteEverything();

    const after = useStore.getState();
    expect(after.phase).toBe("idle");
    expect(after.visit).toBeNull();
    expect(after.settings.childFirstName).toBe("");
    expect(after.settings.volumeCeiling).toBe(0.85);
    expect(await getPhoto(key)).toBeUndefined();
  });
});
