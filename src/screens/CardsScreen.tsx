import { useApp } from "../app/AppContext";
import { useStore } from "../store";
import { TopBar } from "../components/ui";
import { entryById } from "../content/catalogue";
import styles from "./CardsScreen.module.css";

/**
 * Cards. The chosen pack's cards, showing which have been played today. No progress
 * bar, no "4 of 8" — just played or not yet. The UI shows what happened, never what
 * didn't (hard rule §6).
 */
export function CardsScreen() {
  const { getPack } = useApp();
  const selectedPackId = useStore((s) => s.selectedPackId);
  const today = useStore((s) => s.today);

  const entry = selectedPackId ? entryById(selectedPackId) : undefined;
  const pack = selectedPackId ? getPack(selectedPackId) : null;
  const playedIds = new Set((today?.cardsPlayed ?? []).map((c) => c.cardId));

  return (
    <>
      <TopBar title={entry?.title ?? "Cards"} back="library" />
      <div className={styles.screen}>
        {!pack ? (
          <p className={styles.invite}>
            {entry
              ? "This pack's cards download with your physical set. Post one into Bolo to play."
              : "Pick a pack from your library to see its cards."}
          </p>
        ) : (
          <>
            {playedIds.size === 0 && (
              <p className={styles.invite}>
                No cards played yet. Pop one in Bolo's rucksack.
              </p>
            )}
            <ul className={styles.list}>
              {pack.cards.map((card) => {
                const played = playedIds.has(card.id);
                return (
                  <li
                    key={card.id}
                    className={`${styles.card} ${played ? styles.played : ""}`}
                  >
                    <div className={styles.text}>
                      <span className={styles.animal}>{card.animal}</span>
                      <span className={styles.zone}>{card.zone}</span>
                    </div>
                    <span className={played ? styles.tagPlayed : styles.tagNot}>
                      {played ? "Played" : "Not yet"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
