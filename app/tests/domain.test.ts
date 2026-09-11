import assert from "node:assert/strict";
import { test } from "node:test";
import type { Person, Scan } from "../src/shared/contracts.js";
import { buildGraph, mergePeople } from "../src/shared/graph.js";
import { sortPeople } from "../src/web/App/PeoplePanel/sort-people.js";

test("deduplicates identity sources and excludes unselected people from community counts", () => {
  const people = mergePeople([
    {
      id: "user:1",
      name: "Alice",
      username: null,
      sources: ["contacts"],
      avatarUrl: "/api/avatars/user%3A1?v=9",
    },
    {
      id: "user:1",
      name: "Alice",
      username: null,
      sources: ["dialogs"],
      dialogOrder: 3,
    },
    { id: "user:2", name: "Bob", username: null, sources: ["contacts"] },
  ]);
  assert.equal(people.length, 2);
  assert.deepEqual(people[0]?.sources, ["contacts", "dialogs"]);
  assert.equal(people[0]?.avatarUrl, "/api/avatars/user%3A1?v=9");
  assert.equal(people[0]?.dialogOrder, 3);
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

test("sorts people by dialog activity or name with independent selected priority", () => {
  const people: Person[] = [
    { id: "user:1", name: "Charlie", username: null, sources: ["contacts"] },
    {
      id: "user:2",
      name: "Bob",
      username: null,
      sources: ["dialogs"],
      dialogOrder: 1,
    },
    {
      id: "user:3",
      name: "Alice",
      username: null,
      sources: ["dialogs"],
      dialogOrder: 0,
    },
  ];
  assert.deepEqual(
    sortPeople(people, "recent", false, new Set()).map((person) => person.name),
    ["Alice", "Bob", "Charlie"],
  );
  assert.deepEqual(
    sortPeople(people, "alphabetical", false, new Set()).map((person) => person.name),
    ["Alice", "Bob", "Charlie"],
  );
  assert.deepEqual(
    sortPeople(people, "recent", true, new Set(["user:1"])).map((person) => person.name),
    ["Charlie", "Alice", "Bob"],
  );
});
