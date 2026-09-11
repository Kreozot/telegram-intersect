# Decision 0006: People-list ordering

Date: 2026-09-11. Status: ACCEPTED — requested by the owner.

## Decision

Offer two people-list orders: recent dialog activity from newest to oldest and alphabetical A–Z.
Recent activity uses the ordinal position already returned by the paginated Telegram dialog catalog;
it does not issue per-person requests or retain a message timestamp. People without a dialog position
follow positioned dialog identities and are ordered A–Z among themselves.

Provide Selected first as an independent option applied before either base order. Filtering and bulk
selection operate on the resulting visible order. Selection-driven reordering preserves the list's
scroll offset, while stable keyed and memoized rows avoid recreating unchanged row DOM.

## Consequences

- Dialog order is refreshed only when the owner loads dialogs and is a snapshot rather than a date.
- Telegram's returned order, including pinned behavior, is preserved within the main folder; archived
  dialogs follow the main folder because the application discovers those folders separately.
- SQLite and the public catalog retain only a non-negative ordinal position, not message content,
  message IDs, or message timestamps.
- Contact-only identities have no position and therefore sort after known dialogs in recent mode.
