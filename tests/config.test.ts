import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePositiveInteger, requiresHostedProtection } from "../src/server/config.js";

test("uses the selection-limit default and validates configured positive integers", () => {
  assert.equal(parsePositiveInteger(undefined, 50, "LIMIT"), 50);
  assert.equal(parsePositiveInteger("12", 50, "LIMIT"), 12);
  assert.throws(() => parsePositiveInteger("0", 50, "LIMIT"), /positive integer/);
  assert.throws(() => parsePositiveInteger("1.5", 50, "LIMIT"), /positive integer/);
});

test("requires hosted protection except for direct or explicitly proxied loopback access", () => {
  assert.equal(requiresHostedProtection("127.0.0.1", false), false);
  assert.equal(requiresHostedProtection("::1", false), false);
  assert.equal(requiresHostedProtection("0.0.0.0", false), true);
  assert.equal(requiresHostedProtection("0.0.0.0", true), false);
});
