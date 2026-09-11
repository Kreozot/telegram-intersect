import assert from "node:assert/strict";
import { test } from "node:test";
import type { Scan } from "../src/shared/contracts.js";
import { buildGraph, mergePeople } from "../src/shared/graph.js";

test("deduplicates identity sources and excludes unselected people from community counts", () => {
  const people = mergePeople([
    {
      id: "user:1",
      name: "Alice",
      username: null,
      sources: ["contacts"],
      avatarUrl: "/api/avatars/user%3A1?v=9",
    },
    { id: "user:1", name: "Alice", username: null, sources: ["dialogs"] },
    { id: "user:2", name: "Bob", username: null, sources: ["contacts"] },
  ]);
  assert.equal(people.length, 2);
  assert.deepEqual(people[0]?.sources, ["contacts", "dialogs"]);
  assert.equal(people[0]?.avatarUrl, "/api/avatars/user%3A1?v=9");
  const scan: Scan = {
    id: "scan",
    createdAt: "",
    running: false,
    people: people.map((p) => ({
      personId: p.id,
      status: "completed",
      cursor: "0",
      error: null,
      retryAt: null,
      observedAt: "",
      groups: [
        { id: "chat:1", title: "X" },
        { id: "chat:1", title: "X" },
      ],
    })),
  };
  const graph = buildGraph(people, scan, new Set(["user:1"]));
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.nodes.find((node) => node.id === "chat:1")?.count, 1);
  assert.equal(
    graph.nodes.find((node) => node.id === "user:1")?.avatarUrl,
    "/api/avatars/user%3A1?v=9",
  );
});
