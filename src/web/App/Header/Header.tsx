import { ActionIcon, Button, useMantineColorScheme } from "@mantine/core";
import { LogoMark } from "../LogoMark/LogoMark.js";
import styles from "./Header.module.css";

interface Props {
  demo: boolean;
  demoOnly: boolean;
  connected: boolean;
  authenticated: boolean;
  accessMode: "local" | "key";
  onDemo: () => void;
  onLock: () => void;
}
/** Presents brand identity, explicit demo state, and accessible theme/session actions. */
export function Header({
  demo,
  demoOnly,
  connected,
  authenticated,
  accessMode,
  onDemo,
  onLock,
}: Props) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <LogoMark className={styles.mark} />
        <div className={styles.brandText}>
          <strong className={styles.brandName}>
            telegram-intersect<span className={styles.brandAccent}>.</span>
          </strong>
          <small className={styles.brandTagline}>A map of your people</small>
        </div>
      </div>
      <nav className={styles.nav}>
        <span className={styles.status}>
          {demo ? "DEMO DATA" : connected ? "TELEGRAM CONNECTED" : "LOCAL FIRST"}
        </span>
        {!demoOnly && (
          <Button size="xs" variant="subtle" onClick={onDemo}>
            {demo ? "Exit demo" : "Explore demo"}
          </Button>
        )}
        <ActionIcon
          size={30}
          variant="default"
          aria-label={colorScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={colorScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleColorScheme}
        >
          {colorScheme === "dark" ? (
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.4 15.1A8.5 8.5 0 0 1 8.9 3.6 8.5 8.5 0 1 0 20.4 15.1Z" />
            </svg>
          )}
        </ActionIcon>
        {authenticated && accessMode === "key" && !demo && (
          <Button size="xs" variant="subtle" onClick={onLock}>
            Lock
          </Button>
        )}
      </nav>
    </header>
  );
}
