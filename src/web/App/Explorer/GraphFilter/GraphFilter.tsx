import { Switch } from "@mantine/core";
import type { MapMode } from "../../../../shared/contracts.js";
import styles from "./GraphFilter.module.css";

interface Props {
  enabled: boolean;
  disabled: boolean;
  visible: number;
  total: number;
  onChange: (enabled: boolean) => void;
  mode: MapMode;
}

/** Makes the intersection filter explicit while keeping total discovery counts visible. */
export function GraphFilter({ enabled, disabled, visible, total, onChange, mode }: Props) {
  return (
    <div className={styles.toolbar}>
      <Switch
        checked={enabled && !disabled}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        label={`Only intersections (2+ selected ${mode === "people" ? "people" : "communities"})`}
        size="xs"
      />
      <span className={styles.label}>
        {visible} of {total} {mode === "people" ? "communities" : "people"} shown
      </span>
    </div>
  );
}
