import assert from "node:assert/strict";
import { test } from "node:test";
import { ScanService } from "../src/server/scans/scan-service.js";
import { Repository, type StoredPerson } from "../src/server/storage/repository.js";
import { RateLimitError } from "../src/server/telegram/gateway.js";

/** Creates an isolated synthetic catalog for durable scan behavior tests. */
function repository(): Repository {
  const repo = new Repository(":memory:", Buffer.alloc(32, 2));
  repo.savePeople([
    {
      id: "user:1",
      name: "Alice",
      username: null,
      sources: ["contacts"],
      accessHash: "1",
    },
    {
      id: "user:2",
      name: "Bob",
      username: null,
      sources: ["dialogs"],
      accessHash: "2",
    },
  ]);
  return repo;
}
test("paginates, preserves completed data, and clears a recovered scan error", async () => {
  const repo = repository();
  let calls = 0;
  const scans = new ScanService(
    repo,
    {
      commonGroups: async (_person, cursor) => {
        calls++;
        return {
          groups: [{ id: "chat:1", title: "X" }],
          nextCursor: cursor === "0" ? "1" : null,
        };
      },
    },
    0,
  );
  scans.start(["user:1", "user:1"]);
  await scans.settled();
  assert.equal(calls, 2);
  assert.equal(repo.scan()?.people[0]?.groups.length, 1);
  assert.equal(repo.scan()?.people[0]?.status, "completed");
  const prior = repo.completedScan()?.id;
  const failing = new ScanService(
    repo,
    {
      commonGroups: async () => {
        throw new Error("private provider payload");
      },
    },
    0,
  );
  failing.start(["user:1"]);
  await failing.settled();
  assert.equal(repo.scan()?.people[0]?.status, "failed");
  assert.equal(repo.completedScan()?.id, prior);
  assert.equal(JSON.stringify(repo.scan()).includes("private provider payload"), false);
  const recovered = new ScanService(
    repo,
    {
      commonGroups: async () => ({ groups: [{ id: "chat:1", title: "X" }], nextCursor: null }),
    },
    0,
  );
  recovered.resume();
  await recovered.settled();
  assert.equal(repo.scan()?.people[0]?.status, "completed");
  assert.equal(repo.scan()?.people[0]?.error, null);
  repo.close();
});
test("flood wait cancellation retains a retry checkpoint and resume finishes without inventing empty results", async () => {
  const repo = repository();
  const scans = new ScanService(
    repo,
    {
      commonGroups: async () => {
        throw new RateLimitError(100);
      },
    },
    0,
  );
  scans.start(["user:1"]);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(repo.scan()?.people[0]?.status, "waiting");
  await scans.cancel();
  assert.equal(repo.scan()?.people[0]?.status, "cancelled");
  assert.ok(repo.scan()?.people[0]?.retryAt);
  const scan = repo.scan();
  assert.ok(scan);
  const first = scan.people[0];
  assert.ok(first);
  first.retryAt = Date.now() - 1;
  repo.saveScan(scan);
  const resumed = new ScanService(
    repo,
    {
      commonGroups: async () => ({
        groups: [{ id: "chat:2", title: "Y" }],
        nextCursor: null,
      }),
    },
    0,
  );
  resumed.resume();
  await resumed.settled();
  assert.equal(repo.scan()?.people[0]?.status, "completed");
  repo.close();
});
test("adds newly selected people to an active background scan without replacing observations", async () => {
  const repo = repository();
  let releaseFirst: (() => void) | undefined;
  const firstPending = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const calls: string[] = [];
  const scans = new ScanService(
    repo,
    {
      commonGroups: async (person) => {
        calls.push(person.id);
        if (person.id === "user:1") await firstPending;
        return {
          groups: [{ id: `chat:${person.id}`, title: person.name }],
          nextCursor: null,
        };
      },
    },
    0,
  );
  scans.enqueue(["user:1"]);
  scans.enqueue(["user:1", "user:2"]);
  releaseFirst?.();
  await scans.settled();
  assert.deepEqual(calls, ["user:1", "user:2"]);
  assert.deepEqual(
    repo.scan()?.people.map((person) => [person.personId, person.status]),
    [
      ["user:1", "completed"],
      ["user:2", "completed"],
    ],
  );
  repo.close();
});

test("refreshes legacy completed groups once to discover avatar availability", async () => {
  const repo = repository();
  repo.saveScan({
    id: "legacy",
    createdAt: new Date(0).toISOString(),
    running: false,
    people: [
      {
        personId: "user:1",
        status: "completed",
        groups: [{ id: "chat:1", title: "Legacy group" }],
        cursor: "1",
        error: null,
        retryAt: null,
        observedAt: new Date(0).toISOString(),
      },
    ],
  });
  let calls = 0;
  const scans = new ScanService(
    repo,
    {
      commonGroups: async () => {
        calls++;
        repo.markGroupWithoutAvatar("chat:1");
        return { groups: [{ id: "chat:1", title: "Legacy group" }], nextCursor: null };
      },
    },
    0,
  );
  scans.enqueue(["user:1"]);
  await scans.settled();
  scans.enqueue(["user:1"]);
  await scans.settled();
  assert.equal(calls, 1);
  repo.close();
});

test("scans up to three people concurrently", async () => {
  const repo = repository();
  repo.savePeople([
    ...repo.storedPeople(),
    ...[3, 4, 5, 6].map(
      (id): StoredPerson => ({
        id: `user:${id}`,
        name: `Person ${id}`,
        username: null,
        sources: ["contacts"],
        accessHash: String(id),
      }),
    ),
  ]);
  let active = 0;
  let maximumActive = 0;
  const scans = new ScanService(
    repo,
    {
      commonGroups: async () => {
        active++;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return { groups: [], nextCursor: null };
      },
    },
    0,
  );
  scans.start(repo.people().map((person) => person.id));
  await scans.settled();
  assert.equal(maximumActive, 3);
  assert.equal(
    repo.scan()?.people.every((person) => person.status === "completed"),
    true,
  );
  repo.close();
});
