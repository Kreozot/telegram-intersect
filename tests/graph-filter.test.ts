import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphData } from "../src/shared/contracts.js";
import { filterCommunities, filterIntersections } from "../src/shared/graph-filter.js";

test("dense graph filtering preserves people and every edge of shared communities", () => {
  const graph: GraphData = {
    nodes: [0, 1, 2].map((i) => ({
      id: `user:${i}`,
      label: `Person ${i}`,
      kind: "person",
      count: 0,
    })),
    edges: [],
  };
  for (let i = 0; i < 135; i++) {
    const count = i < 52 ? 2 : 1;
    graph.nodes.push({ id: `chat:${i}`, label: `Community ${i}`, kind: "group", count });
    for (let j = 0; j < count; j++) {
      graph.edges.push({ id: `${i}/${j}`, source: `user:${(i + j) % 3}`, target: `chat:${i}` });
    }
  }
  assert.equal(graph.edges.length, 187);
  const filtered = filterCommunities(graph, true);
  assert.equal(filtered.nodes.length, 55);
  assert.equal(filtered.edges.length, 104);
  assert.equal(graph.nodes.length, 138);
  assert.equal(filterCommunities(graph, false), graph);
  assert.ok(filtered.edges.every((edge) => filtered.nodes.some((node) => node.id === edge.target)));
});

test("community mode retains selected groups and people shared by two of them", () => {
  const graph: GraphData = {
    nodes: [
      { id: "user:1", label: "Alice", kind: "person", count: 2 },
      { id: "user:2", label: "Bob", kind: "person", count: 1 },
      { id: "chat:1", label: "One", kind: "group", count: 2 },
      { id: "chat:2", label: "Two", kind: "group", count: 1 },
    ],
    edges: [
      { id: "1", source: "user:1", target: "chat:1" },
      { id: "2", source: "user:1", target: "chat:2" },
      { id: "3", source: "user:2", target: "chat:1" },
    ],
  };
  const filtered = filterIntersections(graph, true, "communities");
  assert.deepEqual(
    filtered.nodes.map((node) => node.id),
    ["user:1", "chat:1", "chat:2"],
  );
  assert.equal(filtered.edges.length, 2);
});

test("one-person maps retain their communities and disjoint maps retain people", () => {
  const graph: GraphData = {
    nodes: [
      { id: "user:1", label: "Alice", kind: "person", count: 1 },
      { id: "chat:1", label: "Community", kind: "group", count: 1 },
    ],
    edges: [{ id: "edge", source: "user:1", target: "chat:1" }],
  };
  assert.equal(filterCommunities(graph, true), graph);
  graph.nodes.push({ id: "user:2", label: "Bob", kind: "person", count: 0 });
  assert.deepEqual(
    filterCommunities(graph, true).nodes.map((node) => node.id),
    ["user:1", "user:2"],
  );
  assert.equal(filterCommunities(graph, true).edges.length, 0);
});
