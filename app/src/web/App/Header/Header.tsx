import { Button, useMantineColorScheme } from "@mantine/core";
import { LogoMark } from "../LogoMark.js";
import styles from "./Header.module.css";

interface Props {
  demo: boolean;
  connected: boolean;
  authenticated: boolean;
  onDemo: () => void;
  onLock: () => void;
}
/** Presents workspace identity, explicit demo state, and accessible theme/session actions. */
export function Header({ demo, connected, authenticated, onDemo, onLock }: Props) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <LogoMark className={styles.mark} />
        <div>
          <strong>
            intersect<span>.</span>
          </strong>
          <small>A map of your people</small>
        </div>
      </div>
      <div className={styles.context}>
        WORKSPACE <span>/</span> Shared communities
      </div>
      <nav className={styles.nav}>
        <span className={styles.status}>
          {demo ? "DEMO DATA" : connected ? "TELEGRAM CONNECTED" : "LOCAL FIRST"}
        </span>
        <Button size="xs" variant="subtle" onClick={onDemo}>
          {demo ? "Exit demo" : "Explore demo"}
        </Button>
        <Button
          size="xs"
          variant="default"
          aria-label="Toggle color theme"
          onClick={toggleColorScheme}
        >
          {colorScheme === "dark" ? "Light" : "Dark"}
        </Button>
        {authenticated && !demo && (
          <Button size="xs" variant="subtle" onClick={onLock}>
            Lock
          </Button>
        )}
      </nav>
    </header>
  );
}
