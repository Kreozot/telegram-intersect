import assert from "node:assert/strict";
import test from "node:test";
import { demoSnapshot } from "../src/web/demo.js";

test("demo people have self-contained avatars and dense shared memberships", () => {
  const snapshot = demoSnapshot();
  const memberships = snapshot.scan?.people.flatMap((person) => person.groups) ?? [];
  const groupCounts = new Map<string, number>();

  for (const group of memberships) {
    groupCounts.set(group.id, (groupCounts.get(group.id) ?? 0) + 1);
  }

  assert.equal(snapshot.people.length, 12);
  assert.ok(snapshot.people.every((person) => person.avatarUrl?.startsWith("data:image/svg+xml,")));
  assert.ok(snapshot.scan?.people.every((person) => person.groups.length >= 5));
  assert.equal(groupCounts.size, 8);
  assert.ok([...groupCounts.values()].every((count) => count >= 7));
});
