import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceEvents } from "../src/server/workspace-events.js";
import type { WorkspaceEvent } from "../src/shared/contracts.js";

test("replays missed SSE deltas by revision", () => {
  const events = new WorkspaceEvents();
  events.publish({ type: "avatar-state", running: true });
  events.publish({ type: "avatar-state", running: false });
  const received: WorkspaceEvent[] = [];
  const unsubscribe = events.subscribe(1, (entry) => received.push(entry.event));
  unsubscribe();
  assert.deepEqual(received, [{ type: "avatar-state", running: false }]);
});
