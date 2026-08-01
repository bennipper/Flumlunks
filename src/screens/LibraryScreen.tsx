import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button, TopBar } from "../components/ui";
import { PackCover } from "../components/PackCover";
import styles from "./LibraryScreen.module.css";

/**
 * Library. The packs the family owns — unlocked by scanning card QR codes — each
 * marked ready for offline. Tapping a pack opens its cards. No progress bars or
 * counts of what's undone (hard rule §6).
 */
export function LibraryScreen() {
  const { catalogue } = useApp();
  const { navigate } = useNav();
  const ownedIds = useStore((s) => s.ownedPackIds);
  const selectPack = useStore((s) => s.selectPack);

  const owned = catalogue.filter((e) => ownedIds.includes(e.id));

  const open = (id: string) => {
    selectPack(id);
    navigate("cards");
  };

  return (
    <>
      <TopBar title="Your packs" />
      <div className={styles.screen}>
        {owned.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>
              No packs yet. Scan the QR inside your Bolo cards to unlock one.
            </p>
            <div className={styles.emptyRow}>
              <Button variant="primary" onClick={() => navigate("scan")}>
                Scan a card
              </Button>
              <Button variant="secondary" onClick={() => navigate("store")}>
                Browse the store
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {owned.map((entry) => (
              <PackCover
                key={entry.id}
                entry={entry}
                owned
                onClick={() => open(entry.id)}
              />
            ))}
          </div>
        )}

        <Button variant="ghost" block onClick={() => navigate("store")}>
          Find more packs
        </Button>
      </div>
    </>
  );
}
