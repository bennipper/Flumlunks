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

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className={`${styles.topbar} ${styles.topbarPad}`}>
      <span className={styles.topbarTitle}>{title}</span>
      {right}
    </header>
  );
}

const TABS: { route: Route; label: string }[] = [
  { route: "live", label: "Today" },
  { route: "cards", label: "Cards" },
  { route: "settings", label: "Settings" },
];

export function TabBar() {
  const { route, navigate } = useNav();
  return (
    <nav className={styles.tabbar} aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.route}
          className={`${styles.tab} ${route === t.route ? styles.tabActive : ""}`}
          aria-current={route === t.route ? "page" : undefined}
          onClick={() => navigate(t.route)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export { styles as uiStyles };
