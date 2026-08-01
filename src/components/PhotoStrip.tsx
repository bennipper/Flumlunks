import { useEffect, useState } from "react";
import type { VisitPhoto } from "../visit/machine";
import { getPhotoUrl } from "../storage/blobs";
import styles from "./PhotoStrip.module.css";

/**
 * Resolves IndexedDB photo blobs to object URLs and revokes them on unmount.
 * Photos never leave the device (BUILD.md hard rule §2) — these URLs are local and
 * short-lived.
 */
export function usePhotoUrls(photos: VisitPhoto[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const p of photos) {
        const url = await getPhotoUrl(p.blobKey);
        if (url) {
          next[p.blobKey] = url;
          created.push(url);
        }
      }
      if (live) setUrls(next);
      else created.forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => {
      live = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  return urls;
}

export function PhotoStrip({ photos }: { photos: VisitPhoto[] }) {
  const urls = usePhotoUrls(photos);
  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        No photos yet. Bolo will ask for one when the moment's right.
      </p>
    );
  }
  return (
    <div className={styles.strip} role="list" aria-label="Photos taken today">
      {photos.map((p) =>
        urls[p.blobKey] ? (
          <img
            key={p.blobKey}
            className={styles.thumb}
            src={urls[p.blobKey]}
            alt={p.prompt || "Photo taken today"}
            role="listitem"
          />
        ) : (
          <div key={p.blobKey} className={styles.thumbLoading} role="listitem" />
        )
      )}
    </div>
  );
}
