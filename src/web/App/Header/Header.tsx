import { Button, useMantineColorScheme } from "@mantine/core";
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
/** Presents workspace identity, explicit demo state, and accessible theme/session actions. */
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
            intersect<span className={styles.brandAccent}>.</span>
          </strong>
          <small className={styles.brandTagline}>A map of your people</small>
        </div>
      </div>
      <div className={styles.context}>
        WORKSPACE <span className={styles.contextSeparator}>/</span> Shared communities
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
        <Button
          size="xs"
          variant="default"
          aria-label="Toggle color theme"
          onClick={toggleColorScheme}
        >
          {colorScheme === "dark" ? "Light" : "Dark"}
        </Button>
        {authenticated && accessMode === "key" && !demo && (
          <Button size="xs" variant="subtle" onClick={onLock}>
            Lock
          </Button>
        )}
      </nav>
    </header>
  );
}
