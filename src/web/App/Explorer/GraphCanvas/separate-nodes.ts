import type { Core } from "cytoscape";

/** Resolves residual body collisions after CoSE without changing graph membership or edge endpoints. */
export function separateNodes(cy: Core): void {
  const nodes = cy.nodes().toArray();
  const gap = 20;
  cy.batch(() => {
    for (let pass = 0; pass < 100; pass++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        const left = nodes[i];
        if (!left) continue;
        for (const right of nodes.slice(i + 1)) {
          const a = left.position();
          const b = right.position();
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const overlapX = (left.outerWidth() + right.outerWidth()) / 2 + gap - Math.abs(dx);
          const overlapY = (left.outerHeight() + right.outerHeight()) / 2 + gap - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const shiftX = overlapX < overlapY ? (Math.sign(dx) || 1) * (overlapX / 2 + 0.1) : 0;
          const shiftY = overlapX < overlapY ? 0 : (Math.sign(dy) || 1) * (overlapY / 2 + 0.1);
          left.position({ x: a.x - shiftX, y: a.y - shiftY });
          right.position({ x: b.x + shiftX, y: b.y + shiftY });
          moved = true;
        }
      }
      if (!moved) break;
    }
  });
}
