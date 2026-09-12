import { Checkbox } from "@mantine/core";
import { memo } from "react";
import type { Group } from "../../../../shared/contracts.js";
import styles from "../PersonRow/PersonRow.module.css";

interface Props {
  community: Group;
  checked: boolean;
  disabled: boolean;
  observedPeople: number;
  onToggle: (id: string) => void;
}

/** Displays one observed community as a selectable map anchor. */
export const CommunityRow = memo(function CommunityRow({
  community,
  checked,
  disabled,
  observedPeople,
  onToggle,
}: Props) {
  return (
    <label
      htmlFor={`select-${community.id}`}
      className={`${styles.row} ${checked ? styles.selected : ""}`}
    >
      <Checkbox
        id={`select-${community.id}`}
        aria-label={`Select ${community.title}`}
        size="xs"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(community.id)}
      />
      <span className={styles.avatar} aria-hidden="true">
        {community.avatarUrl ? (
          <img className={styles.avatarImage} src={community.avatarUrl} alt="" />
        ) : (
          "#"
        )}
      </span>
      <span className={styles.identity}>
        <strong className={styles.identityName}>{community.title}</strong>
        <small className={styles.identityMeta}>Observed community</small>
      </span>
      <span className={styles.trailing} title="Observed people from enabled sources">
        <span className={styles.commonGroupCount}>{observedPeople}</span>
      </span>
    </label>
  );
});
