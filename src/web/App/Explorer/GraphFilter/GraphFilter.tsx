import { Switch } from "@mantine/core";
import styles from "./GraphFilter.module.css";

interface Props {
  enabled: boolean;
  disabled: boolean;
  visible: number;
  total: number;
  onChange: (enabled: boolean) => void;
}

/** Makes the intersection filter explicit while keeping total discovery counts visible. */
export function GraphFilter({ enabled, disabled, visible, total, onChange }: Props) {
  return (
    <div className={styles.toolbar}>
      <Switch
        checked={enabled && !disabled}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        label="Only intersections (2+ selected people)"
        size="xs"
      />
      <span className={styles.label}>
        {visible} of {total} communities shown
      </span>
    </div>
  );
}
