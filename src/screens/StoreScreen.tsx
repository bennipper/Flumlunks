import { useState } from "react";
import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button, TopBar } from "../components/ui";
import { PackCover } from "../components/PackCover";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CatalogueEntry,
} from "../content/catalogue";
import styles from "./StoreScreen.module.css";

/**
 * Store (parent's request). Browse and preview packs by category. Buying is a plain
 * outbound link to an external shop — no in-app payment, no payment SDK, no backend
 * (hard rules §1, §4). You own a pack by scanning the QR inside its physical cards.
 */
export function StoreScreen() {
  const { catalogue } = useApp();
  const { navigate } = useNav();
  const owned = new Set(useStore((s) => s.ownedPackIds));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <TopBar title="Store" />
      <div className={styles.screen}>
        {CATEGORY_ORDER.map((cat) => {
          const entries = catalogue.filter((e) => e.category === cat);
          if (entries.length === 0) return null;
          return (
            <section key={cat} className={styles.category}>
              <h2 className={styles.h}>{CATEGORY_LABELS[cat]}</h2>
              <div className={styles.grid}>
                {entries.map((entry) => (
                  <PackDetail
                    key={entry.id}
                    entry={entry}
                    owned={owned.has(entry.id)}
                    open={openId === entry.id}
                    onToggle={() =>
                      setOpenId((id) => (id === entry.id ? null : entry.id))
                    }
                    onUnlock={() => navigate("scan")}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function PackDetail({
  entry,
  owned,
  open,
  onToggle,
  onUnlock,
}: {
  entry: CatalogueEntry;
  owned: boolean;
  open: boolean;
  onToggle: () => void;
  onUnlock: () => void;
}) {
  return (
    <div className={styles.item}>
      <PackCover entry={entry} owned={owned} onClick={onToggle} />
      {open && (
        <div className={styles.detail}>
          <p className={styles.count}>{entry.cardCount} cards</p>
          <p className={styles.preview}>“{entry.previewLine}”</p>
          {owned ? (
            <p className={styles.ownedNote}>
              {entry.bundled
                ? "You own this pack. It's ready to play offline."
                : "You own this pack."}
            </p>
          ) : (
            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() =>
                  window.open(entry.buyUrl, "_blank", "noopener,noreferrer")
                }
              >
                Get the cards
              </Button>
              <Button variant="secondary" onClick={onUnlock}>
                Unlock with your card
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
