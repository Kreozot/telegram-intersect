import assert from "node:assert/strict";
import { test } from "node:test";
import cytoscape from "cytoscape";
import { separateNodes } from "../src/web/App/Explorer/GraphCanvas/separate-nodes.js";

test("separates overlapping person avatars and group nodes without changing connections", () => {
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    layout: { name: "preset" },
    elements: [
      ...Array.from({ length: 20 }, (_, index) => ({ data: { id: String(index) } })),
      { data: { id: "edge", source: "0", target: "1" } },
    ],
    style: [{ selector: "node", style: { width: 175, height: 50 } }],
  });
  try {
    separateNodes(cy);
    const nodes = cy.nodes().toArray();
    for (const [index, left] of nodes.entries()) {
      for (const right of nodes.slice(index + 1)) {
        const dx = Math.abs(left.position("x") - right.position("x"));
        const dy = Math.abs(left.position("y") - right.position("y"));
        assert.ok(dx >= 175 || dy >= 50, "Node bodies must not overlap");
      }
    }
    assert.equal(cy.edges().length, 1);
    assert.equal(cy.edges()[0]?.source().id(), "0");
  } finally {
    cy.destroy();
  }
});
