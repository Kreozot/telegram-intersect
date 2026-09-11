import { Checkbox } from "@mantine/core";
import type { Person, ScanStatus } from "../../../../shared/contracts.js";
import styles from "./PersonRow.module.css";

interface Props {
  person: Person;
  checked: boolean;
  disabled: boolean;
  status: ScanStatus | null;
  onToggle: (id: string) => void;
}
/** Displays one identity with a cached static avatar and initials as a resilient fallback. */
export function PersonRow({ person, checked, disabled, status, onToggle }: Props) {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <label
      htmlFor={`select-${person.id}`}
      className={`${styles.row} ${checked ? styles.selected : ""}`}
    >
      <Checkbox
        id={`select-${person.id}`}
        aria-label={`Select ${person.name}`}
        size="xs"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(person.id)}
      />
      <span className={styles.avatar} aria-hidden="true">
        {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials}
      </span>
      <span className={styles.identity}>
        <strong>{person.name}</strong>
        <small>{person.username ? `@${person.username}` : person.sources.join(" · ")}</small>
      </span>
      {status && status !== "completed" && (
        <span className={styles.state} title={status}>
          {status}
        </span>
      )}
    </label>
  );
}
