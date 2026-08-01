import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { Button } from "../components/ui";
import { BadgePin } from "../components/BadgePin";
import { PhotoStrip } from "../components/PhotoStrip";
import { badgesFor } from "../output/titles";
import styles from "./DashboardScreen.module.css";

/**
 * Dashboard (home). The parent's menu into everything, plus a glanceable view of
 * what Bolo is doing right now. There is no "start the day" — the child drives play
 * by posting cards, so this is a hub, not a session screen. Every live voice action
 * still shows a tappable equivalent here (BUILD.md §9, non-negotiable).
 */
export function DashboardScreen() {
  const { engineState, device, ownedPacks, primaryPack } = useApp();
  const { navigate } = useNav();
  const today = useStore((s) => s.today);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const status = device.status();
  const pack = primaryPack();
  const badges = today && pack ? badgesFor(today.badges, pack) : [];
  const listening = engineState.status === "listening";
  const hasPacks = ownedPacks.length > 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.brand}>FLUMLUNK</span>
        <span className={styles.headerRight}>
          <span className={styles.status} aria-label="Bolo status">
            <span className={status.connected ? styles.dotOn : styles.dotOff} />
            {status.muted ? "Muted" : `${Math.round(status.battery * 100)}%`}
          </span>
          <button
            className={styles.gear}
            aria-label="Settings"
            onClick={() => navigate("settings")}
          >
            ⚙
          </button>
        </span>
      </header>

      {/* What Bolo is doing right now. */}
      <section className={styles.now} aria-live="polite">
        {engineState.cardId ? (
          <div className={styles.card}>{engineState.animal}</div>
        ) : (
          <div className={styles.cardEmpty}>Bolo is waiting</div>
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
                <Button key={t.id} variant="enamel" large onClick={t.run}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      {!hasPacks && (
        <section className={styles.nudge}>
          <h2 className={styles.nudgeTitle}>Unlock your first pack</h2>
          <p className={styles.nudgeText}>
            Scan the QR code inside your Bolo cards to add a pack. Then post a card
            into Bolo's rucksack and he'll start talking.
          </p>
          <div className={styles.nudgeRow}>
            <Button variant="primary" onClick={() => navigate("scan")}>
              Scan a card
            </Button>
            <Button variant="secondary" onClick={() => navigate("store")}>
              Browse packs
            </Button>
          </div>
        </section>
      )}

      {/* Today with Bolo. */}
      <section className={styles.block}>
        <h2 className={styles.h}>Today with Bolo</h2>
        {badges.length > 0 ? (
          <div className={styles.badges}>
            {badges.map((b) => (
              <BadgePin key={b.id} badge={b} size={56} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No badges yet today.</p>
        )}
        <PhotoStrip photos={today?.photos ?? []} />
        <Button variant="secondary" block onClick={() => navigate("certificate")}>
          See today's certificate
        </Button>
      </section>

      {/* Menu. */}
      <nav className={styles.menu} aria-label="Menu">
        <MenuRow
          label="Your packs"
          hint={hasPacks ? `${ownedPacks.length} ready` : "None yet"}
          onClick={() => navigate("library")}
        />
        <MenuRow label="Find more packs" hint="Store" onClick={() => navigate("store")} />
        <MenuRow label="Scan a card" hint="Unlock" onClick={() => navigate("scan")} />
      </nav>

      <section className={styles.volume}>
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
          onChange={(e) => updateSettings({ volumeCeiling: Number(e.target.value) })}
          className={styles.slider}
        />
      </section>
    </div>
  );
}

function MenuRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button className={styles.menuRow} onClick={onClick}>
      <span className={styles.menuLabel}>{label}</span>
      <span className={styles.menuHint}>{hint} ›</span>
    </button>
  );
}
