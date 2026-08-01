import { get, set, del, keys, createStore } from "idb-keyval";

/**
 * Photo blob storage (BUILD.md hard rules §2). Photos live only as IndexedDB blobs
 * on this device — there is no upload path, no share link, no cloud. Object URLs are
 * minted for display and revoked when no longer needed. The DPIA covers this store.
 */

const photoStore = createStore("flumlunk-photos", "photos");

const PREFIX = "photo:";

export async function putPhoto(blob: Blob): Promise<string> {
  const key = `${PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await set(key, blob, photoStore);
  return key;
}

export async function getPhoto(key: string): Promise<Blob | undefined> {
  return get<Blob>(key, photoStore);
}

export async function getPhotoUrl(key: string): Promise<string | null> {
  const blob = await getPhoto(key);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deletePhoto(key: string): Promise<void> {
  await del(key, photoStore);
}

/** Wipe every photo blob. Used by "Delete everything" (BUILD.md §9 Settings). */
export async function clearAllPhotos(): Promise<void> {
  const allKeys = await keys(photoStore);
  await Promise.all(allKeys.map((k) => del(k, photoStore)));
}
