import type { CatalogueEntry } from "../content/catalogue";
import styles from "./PackCover.module.css";

/**
 * A pack cover in the enamel-sign style, used in the library and store. Covers use
 * only the greens/ink/slate from the palette — never --brass (badges) or --signal
 * (actions).
 */
export function PackCover({
  entry,
  owned,
  size = "regular",
  onClick,
}: {
  entry: CatalogueEntry;
  owned?: boolean;
  size?: "regular" | "wide";
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`${styles.cover} ${size === "wide" ? styles.wide : ""}`}
      onClick={onClick}
      style={{ background: entry.coverColour }}
      aria-label={onClick ? `${entry.title}, ${entry.subtitle}` : undefined}
    >
      <span className={styles.motif} aria-hidden>
        {entry.coverMotif}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{entry.title}</span>
        <span className={styles.subtitle}>{entry.subtitle}</span>
      </span>
      <span className={styles.tag}>
        {owned ? (entry.bundled ? "Ready offline" : "Owned") : "Locked"}
      </span>
    </Tag>
  );
}
