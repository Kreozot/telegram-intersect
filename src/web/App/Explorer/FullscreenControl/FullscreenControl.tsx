import { Button } from "@mantine/core";
import styles from "./FullscreenControl.module.css";

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

/** Provides an accessible corner control for entering and leaving the expanded graph view. */
export function FullscreenControl({ expanded, onToggle }: Props) {
  return (
    <Button
      className={styles.control}
      size="compact-xs"
      variant="default"
      onClick={onToggle}
      aria-pressed={expanded}
      aria-label={expanded ? "Exit full screen" : "Expand graph to full screen"}
    >
      {expanded ? "Exit full screen" : "Full screen"}
    </Button>
  );
}
