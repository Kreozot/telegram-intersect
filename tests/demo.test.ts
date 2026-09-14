import assert from "node:assert/strict";
import test from "node:test";
import { sortPeople } from "../src/web/App/PeoplePanel/sort-people.js";
import { demoSnapshot } from "../src/web/demo.js";

test("demo data represents varied identities, interests, and self-contained avatars", () => {
  const snapshot = demoSnapshot();
  const memberships = snapshot.scan?.people.flatMap((person) => person.groups) ?? [];
  const groupCounts = new Map<string, number>();

  for (const group of memberships) {
    groupCounts.set(group.id, (groupCounts.get(group.id) ?? 0) + 1);
  }

  assert.equal(snapshot.people.length, 20);
  assert.ok(snapshot.people.every((person) => person.avatarUrl?.startsWith("data:image/svg+xml,")));
  assert.ok(memberships.every((group) => group.avatarUrl?.startsWith("data:image/svg+xml,")));
  for (const avatarUrl of [
    ...snapshot.people.map((person) => person.avatarUrl),
    ...memberships.map((group) => group.avatarUrl),
  ]) {
    assert.doesNotThrow(() => decodeURIComponent(avatarUrl?.split(",", 2)[1] ?? ""));
  }
  assert.ok(snapshot.scan?.people.some((person) => person.groups.length === 1));
  assert.ok(snapshot.scan?.people.some((person) => person.groups.length >= 7));
  assert.equal(groupCounts.size, 16);
  assert.ok([...groupCounts.values()].some((count) => count <= 2));
  assert.equal(groupCounts.get("group:1"), 14);
  assert.equal(groupCounts.get("group:6"), 10);
});

test("demo recent people order is visibly different from alphabetical order", () => {
  const people = demoSnapshot().people;
  const recentIds = sortPeople(people, "recent", false, new Set(), new Map()).map(
    (person) => person.id,
  );
  const alphabeticalIds = sortPeople(people, "alphabetical", false, new Set(), new Map()).map(
    (person) => person.id,
  );

  assert.notDeepEqual(recentIds, alphabeticalIds);
  assert.equal(recentIds[0], "user:10");
  assert.equal(recentIds[1], "user:2");
});
