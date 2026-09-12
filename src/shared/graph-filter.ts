import type { GraphData, MapMode } from "./contracts.js";

/** Filters observed communities for the canvas and details list without changing stored scan counts. */
export function filterIntersections(
  graph: GraphData,
  intersectionsOnly: boolean,
  mode: MapMode = "people",
): GraphData {
  const selectedKind = mode === "people" ? "person" : "group";
  if (!intersectionsOnly || graph.nodes.filter((node) => node.kind === selectedKind).length < 2)
    return graph;
  const nodes = graph.nodes.filter((node) => node.kind === selectedKind || node.count >= 2);
  const ids = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
  };
}

/** Preserves the original people-mode API for existing integrations. */
export function filterCommunities(graph: GraphData, intersectionsOnly: boolean): GraphData {
  return filterIntersections(graph, intersectionsOnly, "people");
}
