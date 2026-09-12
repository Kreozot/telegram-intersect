import assert from "node:assert/strict";
import test from "node:test";
import type { Scan } from "../src/shared/contracts.js";
import { shouldPollWorkspace } from "../src/web/App/workspace-refresh.js";

const runningScan: Scan = {
  id: "scan-1",
  createdAt: "2026-09-11T00:00:00Z",
  running: true,
  people: [],
};
const completedScan: Scan = { ...runningScan, running: false };

test("workspace polling runs only while authenticated asynchronous work can change", () => {
  assert.equal(shouldPollWorkspace(false, "qr", runningScan), false);
  assert.equal(shouldPollWorkspace(true, "idle", null), false);
  assert.equal(shouldPollWorkspace(true, "authorized", completedScan), false);
  assert.equal(shouldPollWorkspace(true, "qr", null), true);
  assert.equal(shouldPollWorkspace(true, "connecting", null), true);
  assert.equal(shouldPollWorkspace(true, "authorized", runningScan), true);
  assert.equal(shouldPollWorkspace(true, "authorized", completedScan, true), true);
});
