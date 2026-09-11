import type { GraphData, Scan } from "../../../shared/contracts.js";
import styles from "./DetailsPanel.module.css";

interface Props {
  graph: GraphData;
  focus: string | null;
  onFocus: (id: string | null) => void;
  scan: Scan | null;
}
/** Provides keyboard-accessible community counts and observed neighbors as an alternative to canvas selection. */
export function DetailsPanel({ graph, focus, onFocus, scan }: Props) {
  const node = graph.nodes.find((node) => node.id === focus);
  const groups = graph.nodes
    .filter((node) => node.kind === "group")
    .sort((a, b) => b.count - a.count);
  const neighbors = new Set(
    graph.edges.flatMap((edge) =>
      edge.source === focus ? [edge.target] : edge.target === focus ? [edge.source] : [],
    ),
  );
  const result = scan?.people.find((person) => person.personId === focus);
  return (
    <aside className={styles.panel}>
      <span className={styles.eyebrow}>COMMUNITY LENS</span>
      <h2>{node ? node.label : "Where paths cross"}</h2>
      <p>
        {node
          ? node.kind === "person"
            ? "Shared groups observed for this person."
            : `${node.count} selected people share this group with you.`
          : "Discover the spaces that connect your people."}
      </p>
      {node ? (
        <>
          <button type="button" className={styles.back} onClick={() => onFocus(null)}>
            ← All communities
          </button>
          {node.kind === "person" && (
            <div className={styles.coverage}>
              <strong>Scan: {result?.status ?? "not scanned"}</strong>
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
            {graph.nodes
              .filter((entry) => neighbors.has(entry.id))
              .map((entry) => (
                <button type="button" key={entry.id} onClick={() => onFocus(entry.id)}>
                  <span className={styles.symbol}>{entry.kind === "group" ? "#" : "○"}</span>
                  <span>{entry.label}</span>
                  <span>↗</span>
                </button>
              ))}
          </div>
          {!neighbors.size && (
            <p>No observed connections. Check scan coverage before drawing conclusions.</p>
          )}
        </>
      ) : (
        <>
          <div className={styles.subhead}>
            SHARED GROUPS <span>{groups.length}</span>
          </div>
          <div className={styles.items}>
            {groups.map((group) => (
              <button type="button" key={group.id} onClick={() => onFocus(group.id)}>
                <span className={styles.symbol}>#</span>
                <span>
                  {group.label}
                  <small>
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
      )}
      <div className={styles.insight}>
        <span>↗</span>
        <strong>Shared spaces, not assumptions.</strong>
        <p>
          A connection means a shared group. It does not mean two people know each other. Counts
          cover selected people, not total group membership.
        </p>
      </div>
    </aside>
  );
}
