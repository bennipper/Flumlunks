import { useApp } from "../app/AppContext";
import { useStore } from "../store";
import { TopBar } from "../components/ui";
import styles from "./CardsScreen.module.css";

/**
 * Cards (BUILD.md §9). The pack, showing which have been played today. No progress
 * bar, no "4 of 8" — just played or not yet. The UI shows what happened, never what
 * didn't (hard rule §6).
 */
export function CardsScreen() {
  const { pack } = useApp();
  const visit = useStore((s) => s.visit);
  if (!pack) return null;

  const playedIds = new Set((visit?.cardsPlayed ?? []).map((c) => c.cardId));
  const anyPlayed = playedIds.size > 0;

  return (
    <>
      <TopBar title="Cards" />
      <div className={styles.screen}>
        {!anyPlayed && (
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
      </div>
    </>
  );
}
