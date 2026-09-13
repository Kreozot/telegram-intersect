# Decision 0007: Adaptive browser refresh

Date: 2026-09-11. Status: SUPERSEDED by Decision 0014.

## Decision

The browser polls normalized Telegram and snapshot state only while login, a scan, or sequential
avatar caching is in progress. An idle authenticated workspace does not poll. User commands and
returning to a visible tab trigger one refresh.

The browser checks `/api/access` when the workspace first opens or is currently locked. Once
authenticated, protected workspace requests detect session expiry through HTTP 401 responses instead
of repeatedly requesting the access endpoint.

## Consequences

- Idle workspaces stop producing recurring API traffic.
- Login transitions, partial scan progress, and newly cached avatars remain visible without manual
  reloads.
- Each open tab performs its own polling only while asynchronous work is active.
- A session that expires while an idle tab remains continuously visible is shown as locked on its next
  command, protected refresh, or visibility return.
