import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
test("Pinokio captures the server URL and preserves data during dependency reset", async () => {
  const start = require("../../start.js");
  assert.equal(start.daemon, true);
  const matcher = start.run[0].params.on[0].event;
  const match = new RegExp(matcher.slice(1, -1)).exec("Intersect ready at http://127.0.0.1:54321");
  assert.equal(match?.[1], "http://127.0.0.1:54321");
  assert.equal(start.run[1].params.url, "{{input.event[1]}}");
  const reset = require("../../reset.js");
  assert.deepEqual(
    reset.run.map((step: { params: { path: string } }) => step.params.path),
    ["runtime", "app/node_modules", "app/dist"],
  );
  const launcher = require("../../pinokio.js");
  const menu = await launcher.menu({}, { running: () => false, exists: () => false });
  assert.equal(menu[0].href, "install.js");
  assert.equal(menu[0].default, true);
});
