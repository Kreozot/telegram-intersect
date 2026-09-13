import assert from "node:assert/strict";
import { test } from "node:test";
import { queueCatalogCounts, refreshCatalogAndQueueCounts } from "../src/server/catalog-refresh.js";
import type { Person, Scan } from "../src/shared/contracts.js";

/** Creates a minimal persisted scan for catalog orchestration tests. */
function scan(running: boolean): Scan {
  return {
    id: "scan-1",
    createdAt: "2026-09-13T00:00:00.000Z",
    running,
    people: [
      {
        personId: "user:1",
        status: running ? "scanning" : "completed",
        groups: [],
        cursor: "0",
        error: null,
        retryAt: null,
        observedAt: null,
      },
    ],
  };
}

test("queues every loaded source identity after returning the catalog", async () => {
  let people: Person[] = [];
  const events: string[] = [];
  await refreshCatalogAndQueueCounts(
    "contacts",
    { scan: () => null, people: () => people },
    {
      loadPeople: async () => {
        events.push("loaded");
        people = [
          { id: "user:1", name: "Alice", username: null, sources: ["contacts"] },
          { id: "user:2", name: "Bob", username: null, sources: ["dialogs"] },
        ];
      },
    },
    {
      cancel: async () => {
        events.push("cancelled");
      },
      enqueue: (ids) => {
        events.push(`queued:${ids.join(",")}`);
        return scan(true);
      },
    },
  );
  assert.deepEqual(events, ["loaded", "queued:user:1"]);
});

test("settles an active scan and resumes unfinished people with the new source", async () => {
  let current = scan(true);
  let people: Person[] = [{ id: "user:1", name: "Alice", username: null, sources: ["contacts"] }];
  const events: string[] = [];
  await refreshCatalogAndQueueCounts(
    "dialogs",
    { scan: () => current, people: () => people },
    {
      loadPeople: async () => {
        events.push("loaded");
        people = [...people, { id: "user:2", name: "Bob", username: null, sources: ["dialogs"] }];
      },
    },
    {
      cancel: async () => {
        events.push("cancelled");
        current = scan(false);
      },
      enqueue: (ids) => {
        events.push(`queued:${ids.join(",")}`);
        return scan(true);
      },
    },
  );
  assert.deepEqual(events, ["cancelled", "loaded", "queued:user:1,user:2"]);
});

test("queues the persisted catalog when an authorized workspace is opened", () => {
  const people: Person[] = [
    { id: "user:1", name: "Alice", username: null, sources: ["contacts"] },
    { id: "user:2", name: "Bob", username: null, sources: ["dialogs"] },
  ];
  let queued: string[] = [];
  const result = queueCatalogCounts(
    { scan: () => null, people: () => people },
    {
      cancel: async () => undefined,
      enqueue: (ids) => {
        queued = ids;
        return scan(true);
      },
    },
  );
  assert.deepEqual(queued, ["user:1", "user:2"]);
  assert.equal(result?.running, true);
});

test("does not create a scan when the persisted catalog is empty", () => {
  let enqueueCalls = 0;
  const result = queueCatalogCounts(
    { scan: () => null, people: () => [] },
    {
      cancel: async () => undefined,
      enqueue: () => {
        enqueueCalls++;
        return scan(true);
      },
    },
  );
  assert.equal(result, null);
  assert.equal(enqueueCalls, 0);
});
