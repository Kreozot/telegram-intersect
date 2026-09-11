import type { GraphData } from "./contracts.js";

/** Filters observed communities for the canvas and details list without changing stored scan counts. */
export function filterCommunities(graph: GraphData, intersectionsOnly: boolean): GraphData {
  const people = graph.nodes.filter((node) => node.kind === "person");
  if (!intersectionsOnly || people.length < 2) return graph;
  const nodes = graph.nodes.filter((node) => node.kind === "person" || node.count >= 2);
  const ids = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
  };
}
