# Decision 0004: Selection-triggered common-group scans

Date: 2026-09-11. Status: ACCEPTED — requested by the owner.

## Decision

Selecting one or more people automatically adds them to the durable common-group scan queue after
a short browser debounce. The network work remains asynchronous and sequential. It does not block
selection changes, and it continues to use pagination checkpoints and Telegram flood-wait handling.

The current scan is an expandable cache of observed people rather than a replacement job for each
selection. Adding a person while a scan is running appends a queued entry. Previously completed
results are reused. Removing a person changes the visible graph but does not delete observations or
interrupt an in-flight Telegram request.

## Consequences

- The graph appears and grows from partial results without a separate build action.
- Bulk selection queues every newly selected person, while the sequential worker limits request
  concurrency and preserves rate-limit waits.
- Explicit cancel and resume controls remain available for long, interrupted, or failed scans.
- A 250 ms debounce coalesces rapid checkbox and bulk-selection changes.
- Catalog discovery and Telegram group scanning remain separate API operations.
