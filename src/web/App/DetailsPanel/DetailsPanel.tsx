import type { GraphData, Scan } from "../../../shared/contracts.js";
import { CommunityOverview } from "./CommunityOverview/CommunityOverview.js";
import { DetailsInsight } from "./DetailsInsight/DetailsInsight.js";
import styles from "./DetailsPanel.module.css";
import { FocusedNodeDetails } from "./FocusedNodeDetails/FocusedNodeDetails.js";

interface Props {
  className: string;
  graph: GraphData;
  focus: string | null;
  onFocus: (id: string | null) => void;
  scan: Scan | null;
}
/** Provides keyboard-accessible community counts and observed neighbors as an alternative to canvas selection. */
export function DetailsPanel({ className, graph, focus, onFocus, scan }: Props) {
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
  const neighborNodes = graph.nodes.filter((entry) => neighbors.has(entry.id));
  const description = node
    ? node.kind === "person"
      ? "Shared groups observed for this person."
      : `${node.count} selected people share this group with you.`
    : "Discover the spaces that connect your people.";
  return (
    <aside className={`${styles.panel} ${className}`}>
      <span className={styles.eyebrow}>COMMUNITY LENS</span>
      <h2 className={styles.title}>{node ? node.label : "Where paths cross"}</h2>
      <p className={styles.description}>{description}</p>
      {node ? (
        <FocusedNodeDetails
          node={node}
          neighbors={neighborNodes}
          result={result}
          onFocus={onFocus}
        />
      ) : (
        <CommunityOverview groups={groups} onFocus={onFocus} />
      )}
      <DetailsInsight />
    </aside>
  );
}
