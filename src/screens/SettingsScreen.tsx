import { useState } from "react";
import { useStore } from "../store";
import { useNav } from "../app/router";
import { Button, TopBar } from "../components/ui";
import styles from "./SettingsScreen.module.css";

/**
 * Settings (BUILD.md §9). Child first name, volume ceiling, Bolo mute, gap length
 * (dev), a plain-language data section, and Delete everything with one confirmation.
 */
export function SettingsScreen() {
  const { navigate } = useNav();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const deleteEverything = useStore((s) => s.deleteEverything);
  const [confirming, setConfirming] = useState(false);

  const doDelete = async () => {
    await deleteEverything();
    setConfirming(false);
    navigate("dashboard");
  };

  return (
    <>
      <TopBar title="Settings" />
      <div className={styles.screen}>
        <section className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Child's first name
          </label>
          <input
            id="name"
            className={styles.input}
            value={settings.childFirstName}
            onChange={(e) => updateSettings({ childFirstName: e.target.value })}
            placeholder="First name only"
            autoComplete="off"
            maxLength={24}
          />
        </section>

        <section className={styles.field}>
          <label className={styles.label} htmlFor="vol2">
            Volume ceiling
          </label>
          <input
            id="vol2"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volumeCeiling}
            onChange={(e) => updateSettings({ volumeCeiling: Number(e.target.value) })}
            className={styles.slider}
          />
        </section>

        <section className={styles.rowField}>
          <span className={styles.label}>Mute Bolo</span>
          <button
            role="switch"
            aria-checked={settings.muted}
            className={`${styles.toggle} ${settings.muted ? styles.on : ""}`}
            onClick={() => updateSettings({ muted: !settings.muted })}
          >
            <span className={styles.knob} />
          </button>
        </section>

        <section className={styles.field}>
          <label className={styles.label} htmlFor="gap">
            Gap length (dev) — {(settings.gapMs / 1000).toFixed(1)}s
          </label>
          <input
            id="gap"
            type="range"
            min={1000}
            max={8000}
            step={250}
            value={settings.gapMs}
            onChange={(e) => updateSettings({ gapMs: Number(e.target.value) })}
            className={styles.slider}
          />
          <span className={styles.hint}>
            The quiet moment after each thing Bolo says — where the child talks to
            you. Expect the right value to feel too long in a quiet room.
          </span>
        </section>

        <section className={styles.data}>
          <h2 className={styles.h}>Your data</h2>
          <p>
            Everything stays on this phone. Photos, badges and your child's first
            name are stored only here, and nothing is ever uploaded.
          </p>
          <p>
            There is no account, no cloud and no sharing built in. Bolo doesn't use
            your location — the card in the rucksack is the only signal.
          </p>
          <p>
            Packs you've unlocked are stored here too. If you delete them, scan the QR
            inside your cards again to get them back.
          </p>
        </section>

        {!confirming ? (
          <Button variant="secondary" block large onClick={() => setConfirming(true)}>
            Delete everything
          </Button>
        ) : (
          <div className={styles.confirm} role="alertdialog" aria-label="Confirm delete">
            <p className={styles.confirmText}>
              This deletes every photo, badge, today and unlocked pack on this phone.
              It can't be undone, though you can scan your cards again.
            </p>
            <div className={styles.confirmRow}>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep everything
              </Button>
              <Button variant="primary" onClick={doDelete}>
                Delete everything
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
