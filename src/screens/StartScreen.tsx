import { useState } from "react";
import { Button } from "../components/ui";
import { useApp } from "../app/AppContext";
import { useNav } from "../app/router";
import { useStore } from "../store";
import { getSimBolo } from "../bolo";
import styles from "./StartScreen.module.css";

/**
 * Start (BUILD.md §9). Pick venue (one option), optional child first name, start
 * the day. Two sentences of explanation. No permissions requested yet.
 */
export function StartScreen() {
  const { pack, engine } = useApp();
  const { navigate } = useNav();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const startVisit = useStore((s) => s.startVisit);
  const [name, setName] = useState(settings.childFirstName);

  if (!pack) return null;

  const start = () => {
    // First user gesture — safe to unlock audio now (no permission prompt).
    getSimBolo()?.primeAudio();
    updateSettings({ childFirstName: name.trim() });
    engine.reset();
    startVisit({ packId: pack.id, packVersion: pack.version });
    navigate("live");
  };

  return (
    <div className={`${styles.wrap}`}>
      <div className={styles.brand}>FLUMLUNK</div>
      <h1 className={styles.title}>A day with Bolo</h1>

      <p className={styles.lede}>
        Post an animal card into Bolo's rucksack and he'll talk about that animal.
        Your phone downloads the venue, takes the photos and makes a certificate at
        the end of the day.
      </p>

      <div className={styles.field}>
        <span className={styles.label}>Venue</span>
        <div className={styles.venue} aria-live="polite">
          {pack.venueName}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="childName">
          Child's first name (optional)
        </label>
        <input
          id="childName"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name only"
          autoComplete="off"
          maxLength={24}
        />
        <span className={styles.hint}>
          First name only, kept on this phone. Nothing is uploaded.
        </span>
      </div>

      <div className={styles.spacer} />

      <Button variant="primary" large block onClick={start}>
        Start the day
      </Button>
    </div>
  );
}
