import type { GraphNode, PersonScan } from "../../../../shared/contracts.js";
import styles from "./FocusedNodeDetails.module.css";

interface Props {
  node: GraphNode;
  neighbors: GraphNode[];
  result: PersonScan | undefined;
  onFocus: (id: string | null) => void;
}

/** Shows scan coverage and observed neighbors for the currently focused graph entity. */
export function FocusedNodeDetails({ node, neighbors, result, onFocus }: Props) {
  return (
    <>
      <button type="button" className={styles.back} onClick={() => onFocus(null)}>
        ← All communities
      </button>
      {node.kind === "person" && (
        <div className={styles.coverage}>
          <strong className={styles.coverageStatus}>Scan: {result?.status ?? "not scanned"}</strong>
          <span>
            {result?.observedAt
              ? `Observed ${new Date(result.observedAt).toLocaleString()}`
              : "Not observed yet"}
          </span>
          {!result && <span>This person's background scan is being queued.</span>}
          {result?.error && <span>{result.error}</span>}
        </div>
      )}
      <div className={styles.items}>
        {neighbors.map((entry) => (
          <button
            className={styles.itemButton}
            type="button"
            key={entry.id}
            onClick={() => onFocus(entry.id)}
          >
            <span className={styles.symbol} aria-hidden="true">
              {entry.avatarUrl ? (
                <img className={styles.avatarImage} src={entry.avatarUrl} alt="" />
              ) : entry.kind === "group" ? (
                "#"
              ) : (
                "○"
              )}
            </span>
            <span className={styles.itemLabel}>{entry.label}</span>
            <span>↗</span>
          </button>
        ))}
      </div>
      {!neighbors.length && (
        <p className={styles.description}>
          No observed connections. Check scan coverage before drawing conclusions.
        </p>
      )}
    </>
  );
}
