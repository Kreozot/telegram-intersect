import assert from "node:assert/strict";
import { test } from "node:test";
import type { Person, Scan } from "../src/shared/contracts.js";
import {
  buildGraph,
  filterPeopleBySources,
  mergePeople,
  observedCommunities,
} from "../src/shared/graph.js";
import { sortCommunities } from "../src/web/App/PeoplePanel/sort-communities.js";
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
        { id: "chat:1", title: "X", avatarUrl: "/api/avatars/chat%3A1?v=4" },
        { id: "chat:1", title: "X", avatarUrl: "/api/avatars/chat%3A1?v=4" },
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
  assert.equal(
    graph.nodes.find((node) => node.id === "chat:1")?.avatarUrl,
    "/api/avatars/chat%3A1?v=4",
  );
});

test("inverts observed memberships when communities are selected", () => {
  const people: Person[] = [
    { id: "user:1", name: "Alice", username: null, sources: ["contacts"] },
    { id: "user:2", name: "Bob", username: null, sources: ["dialogs"] },
  ];
  const scan: Scan = {
    id: "scan",
    createdAt: "",
    running: false,
    people: people.map((person) => ({
      personId: person.id,
      status: "completed",
      cursor: "0",
      error: null,
      retryAt: null,
      observedAt: "",
      groups: [
        { id: "chat:1", title: "Shared" },
        ...(person.id === "user:1" ? [{ id: "chat:2", title: "Contact only" }] : []),
      ],
    })),
  };
  assert.deepEqual(
    filterPeopleBySources(people, new Set(["contacts"])).map((person) => person.id),
    ["user:1"],
  );
  assert.deepEqual(
    observedCommunities(scan).map((group) => group.id),
    ["chat:1", "chat:2"],
  );
  const graph = buildGraph(people, scan, new Set(["chat:1", "chat:2"]), "communities");
  assert.equal(graph.nodes.find((node) => node.id === "user:1")?.count, 2);
  assert.equal(graph.nodes.find((node) => node.id === "user:2")?.count, 1);
  assert.equal(graph.nodes.find((node) => node.id === "chat:1")?.count, 2);
  assert.equal(graph.edges.length, 3);
});

test("sorts communities by discovery, title, or common people with selected priority", () => {
  const communities = [
    { id: "chat:2", title: "Zulu" },
    { id: "chat:1", title: "Alpha" },
  ];
  assert.deepEqual(
    sortCommunities(communities, "recent", false, new Set(), new Map()).map((group) => group.id),
    ["chat:2", "chat:1"],
  );
  assert.deepEqual(
    sortCommunities(communities, "alphabetical", false, new Set(), new Map()).map(
      (group) => group.id,
    ),
    ["chat:1", "chat:2"],
  );
  assert.deepEqual(
    sortCommunities(communities, "alphabetical", true, new Set(["chat:2"]), new Map()).map(
      (group) => group.id,
    ),
    ["chat:2", "chat:1"],
  );
  assert.deepEqual(
    sortCommunities(
      communities,
      "common",
      false,
      new Set(),
      new Map([
        ["chat:1", 4],
        ["chat:2", 1],
      ]),
    ).map((group) => group.id),
    ["chat:1", "chat:2"],
  );
});

test("sorts people by dialog activity, name, or common groups with selected priority", () => {
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
    sortPeople(people, "recent", false, new Set(), new Map()).map((person) => person.name),
    ["Alice", "Bob", "Charlie"],
  );
  assert.deepEqual(
    sortPeople(people, "alphabetical", false, new Set(), new Map()).map((person) => person.name),
    ["Alice", "Bob", "Charlie"],
  );
  assert.deepEqual(
    sortPeople(people, "recent", true, new Set(["user:1"]), new Map()).map((person) => person.name),
    ["Charlie", "Alice", "Bob"],
  );
  assert.deepEqual(
    sortPeople(
      people,
      "common",
      false,
      new Set(),
      new Map([
        ["user:1", 3],
        ["user:2", 1],
        ["user:3", 2],
      ]),
    ).map((person) => person.name),
    ["Charlie", "Alice", "Bob"],
  );
});
