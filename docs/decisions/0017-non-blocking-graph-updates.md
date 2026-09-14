# Decision 0017: Non-blocking selection-driven graph updates

Date: 2026-09-15. Status: ACCEPTED — requested by the owner.

## Decision

Keep catalog selection controls on React's urgent update path while deriving the graph from a
deferred selection snapshot. Maintain one Cytoscape instance for the canvas and reconcile its nodes
and edges in place instead of destroying and recreating the renderer after every selection change.

Schedule CoSE layout work for the next animation frame. Cancel a queued or superseded layout before
starting the newest one. Keep the approved CoSE iteration count and collision-separation algorithm
unchanged in this change.

## Consequences

- Checkbox and list feedback can paint before expensive graph layout work starts.
- Rapid selection changes can replace a queued layout before it consumes the main thread.
- Existing canvas event listeners, renderer state, and container observers survive graph changes.
- CoSE itself still runs on the browser main thread once started, so a sufficiently large layout may
  still delay frames while the map catches up.
