import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";
import { useNav, type Route } from "../app/router";

type Variant = "primary" | "secondary" | "enamel" | "ghost";

export function Button({
  variant = "primary",
  block,
  large,
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  block?: boolean;
  large?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    styles.btn,
    styles[variant],
    block ? styles.block : "",
    large ? styles.large : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function TopBar({
  title,
  right,
  back = "dashboard",
  showBack = true,
}: {
  title: string;
  right?: ReactNode;
  back?: Route;
  showBack?: boolean;
}) {
  const { navigate } = useNav();
  return (
    <header className={`${styles.topbar} ${styles.topbarPad}`}>
      <div className={styles.topbarLeft}>
        {showBack && (
          <button
            className={styles.back}
            onClick={() => navigate(back)}
            aria-label="Back"
          >
            ‹
          </button>
        )}
        <span className={styles.topbarTitle}>{title}</span>
      </div>
      {right}
    </header>
  );
}

export { styles as uiStyles };
