import type { GraphNode } from "../../../../shared/contracts.js";
import styles from "./CommunityOverview.module.css";

interface Props {
  groups: GraphNode[];
  onFocus: (id: string) => void;
}

/** Lists all visible communities when the details panel has no focused graph node. */
export function CommunityOverview({ groups, onFocus }: Props) {
  return (
    <>
      <div className={styles.subhead}>
        SHARED GROUPS <span className={styles.countLabel}>{groups.length}</span>
      </div>
      <div className={styles.items}>
        {groups.map((group) => (
          <button
            className={styles.itemButton}
            type="button"
            key={group.id}
            onClick={() => onFocus(group.id)}
          >
            <span className={styles.symbol} aria-hidden="true">
              {group.avatarUrl ? (
                <img className={styles.avatarImage} src={group.avatarUrl} alt="" />
              ) : (
                "#"
              )}
            </span>
            <span className={styles.itemLabel}>
              {group.label}
              <small className={styles.itemMeta}>
                {group.count === 1 ? "1 person" : `${group.count} people`} in your selection
              </small>
            </span>
            <span className={styles.count}>{group.count}</span>
          </button>
        ))}
      </div>
      {!groups.length && (
        <div className={styles.placeholder}>
          Your communities will appear here as background scans finish.
        </div>
      )}
    </>
  );
}
