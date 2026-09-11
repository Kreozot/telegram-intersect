import assert from "node:assert/strict";
import { test } from "node:test";
import { ScanService } from "../src/server/scans/scan-service.js";
import { Repository } from "../src/server/storage/repository.js";
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
  ]);
  return repo;
}
test("paginates, deduplicates memberships, and preserves the completed snapshot on failed refresh", async () => {
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
