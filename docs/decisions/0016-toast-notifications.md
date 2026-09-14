# Decision 0016: Transient workspace notifications

Date: 2026-09-15. Status: ACCEPTED — requested by the owner.

## Decision

Use `@mantine/notifications`, matching the approved Mantine version, for global workspace errors and
successful load or update feedback. Render one notification container at the bottom-right of the
page. Success messages close automatically; errors remain longer but can still be dismissed.

Keep login-flow status and destructive-action confirmation inside their owning panels. Prevent
selection-triggered scan requests while another explicit workspace command is busy, then retry from
the settled selection after that command completes.

## Consequences

- Recoverable feedback no longer inserts a large persistent block above the workspace.
- Repeated background failures share a stable notification identity instead of creating a toast
  flood.
- Changing selection during catalog discovery waits for the discovery command to settle, avoiding
  the expected `Wait for catalog discovery to finish` conflict.
- The browser bundle gains the official Mantine notifications package and its stylesheet.
