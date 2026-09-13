import assert from "node:assert/strict";
import test from "node:test";
import { shouldPollWorkspace } from "../src/web/App/workspace-refresh.js";

test("workspace polling is retained only for interactive login state", () => {
  assert.equal(shouldPollWorkspace(false, "qr"), false);
  assert.equal(shouldPollWorkspace(true, "idle"), false);
  assert.equal(shouldPollWorkspace(true, "authorized"), false);
  assert.equal(shouldPollWorkspace(true, "qr"), true);
  assert.equal(shouldPollWorkspace(true, "connecting"), true);
});
