import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button, TopBar } from "../components/ui";
import { BadgePin } from "../components/BadgePin";
import { PhotoStrip } from "../components/PhotoStrip";
import { badgesFor } from "../output/titles";
import styles from "./LiveScreen.module.css";

/**
 * Live (BUILD.md §9) — the screen the parent glances at. Large statement of what
 * Bolo is doing, badges, the photo strip, status, and — non-negotiable — a
 * tappable equivalent for every voice action while its beat is live.
 */
export function LiveScreen() {
  const { pack, engine, engineState, device } = useApp();
  const { navigate } = useNav();
  const visit = useStore((s) => s.visit);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const endVisit = useStore((s) => s.endVisit);

  if (!pack || !visit) return null;

  const status = device.status();
  const badges = badgesFor(visit.badges, pack);
  const listening = engineState.status === "listening";
  const cardName = engineState.animal ?? "";

  const end = () => {
    engine.reset();
    endVisit();
    navigate("certificate");
  };

  return (
    <>
      <TopBar
        title="Today"
        right={
          <span className={styles.status} aria-label="Bolo status">
            <span className={status.connected ? styles.dotOn : styles.dotOff} />
            {status.muted ? "Muted" : `${Math.round(status.battery * 100)}%`}
          </span>
        }
      />

      <div className={styles.screen}>
        {/* What Bolo is doing right now, large. */}
        <section className={styles.now} aria-live="polite">
          {cardName ? (
            <div className={styles.card}>{cardName}</div>
          ) : (
            <div className={styles.cardEmpty}>No card in the rucksack</div>
          )}
          <div className={styles.beat}>{engineState.plainLabel}</div>

          {listening && (
            <div className={styles.mic}>
              <span className={styles.micDot} /> Listening…{" "}
              {Math.ceil(engineState.micRemainingMs / 1000)}s
            </div>
          )}

          {engineState.taps.length > 0 && (
            <div className={styles.taps}>
              <div className={styles.tapsLabel}>Or tap for Bolo</div>
              <div className={styles.tapRow}>
                {engineState.taps.map((t) => (
                  <Button
                    key={t.id}
                    variant="enamel"
                    large
                    onClick={t.run}
                    aria-label={t.label}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.block}>
          <h2 className={styles.h}>Badges today</h2>
          {badges.length > 0 ? (
            <div className={styles.badges}>
              {badges.map((b) => (
                <div key={b.id} className={styles.badgeItem}>
                  <BadgePin badge={b} size={64} />
                  <span className={styles.badgeName}>{b.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              No badges yet. They arrive as you meet the animals.
            </p>
          )}
        </section>

        <section className={styles.block}>
          <h2 className={styles.h}>Photos today</h2>
          <PhotoStrip photos={visit.photos} />
        </section>

        <section className={styles.block}>
          <label className={styles.h} htmlFor="vol">
            Volume ceiling
          </label>
          <input
            id="vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volumeCeiling}
            onChange={(e) =>
              updateSettings({ volumeCeiling: Number(e.target.value) })
            }
            className={styles.slider}
          />
        </section>

        <div className={styles.endWrap}>
          <Button variant="secondary" block large onClick={end}>
            End the day
          </Button>
        </div>
      </div>
    </>
  );
}
