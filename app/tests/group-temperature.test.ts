import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addGroupTemperatureColors,
  getGroupTemperatureColor,
} from "../src/web/App/Explorer/GraphCanvas/group-temperature.js";

test("maps community intersections from cool to warm across the selected people", () => {
  assert.equal(getGroupTemperatureColor(1, 5), "hsl(220, 72%, 58%)");
  assert.equal(getGroupTemperatureColor(3, 5), "hsl(110, 72%, 58%)");
  assert.equal(getGroupTemperatureColor(5, 5), "hsl(0, 72%, 58%)");
});

test("adds temperature colors to communities using people as the upper bound", () => {
  const nodes = addGroupTemperatureColors([
    { id: "user:1", label: "Alice", kind: "person", count: 2 },
    { id: "user:2", label: "Bob", kind: "person", count: 1 },
    { id: "chat:1", label: "Shared", kind: "group", count: 2 },
  ]);

  assert.equal(nodes.find((node) => node.id === "chat:1")?.temperatureColor, "hsl(0, 72%, 58%)");
});
