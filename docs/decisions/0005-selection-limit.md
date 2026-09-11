# Decision 0005: Configurable simultaneous selection limit

Date: 2026-09-11. Status: ACCEPTED — requested by the owner.

## Decision

Limit the number of people selected at the same time with `MAX_SELECTED_PEOPLE`. The default is 50,
and invalid non-positive or non-integer values prevent startup.

The server publishes the limit through the access-status contract and enforces it at the scan API
boundary. The browser applies the same limit to individual selection, filtered bulk selection, and
the synthetic demo.

## Consequences

- Operators can tune the maximum without rebuilding the application.
- Unchecked people become unavailable when the selection is full; selected people remain removable.
- Bulk selection preserves existing choices and fills the remaining capacity in visible list order.
- Direct API calls cannot enqueue a simultaneous selection larger than the configured maximum.
