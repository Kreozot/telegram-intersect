# Decision 0014: Adaptive scan concurrency and SSE updates

Date: 2026-09-13. Status: ACCEPTED — requested by the owner.

## Decision

Replace the fixed 1.2-second sequential common-chat scanner with an adaptive pool. Start with three
concurrent people, keep only a short 200–350 ms jitter between successful page requests, and treat a
Telegram `FLOOD_WAIT` as a global queue barrier. After a flood wait, reduce new work to one person at
a time and restore one concurrency slot after each ten successful requests, up to three.

Replace scan/avatar snapshot polling with a same-origin Server-Sent Events stream. The browser still
loads one initial snapshot and refreshes after explicit commands or tab restoration, but ongoing work
is represented as individual person, compact scan-state, and avatar-revision events. Keep the small
Telegram-login status poll because QR and challenge state are separate short-lived authorization
transitions.

## Consequences

- Normal catalog scans can use parallel Telegram RPCs while observed flood limits remain authoritative.
- Per-page checkpoints remain durable and cancellation waits only for currently active RPCs.
- Scan growth no longer retransmits the complete catalog and all prior memberships every 1.8 seconds.
- SSE is one-way and fits the update flow; existing HTTP mutation endpoints remain simpler than a
  bidirectional WebSocket command protocol.
- Reverse proxies must allow `text/event-stream`, disable response buffering, and keep the connection
  open; the endpoint emits a heartbeat every 20 seconds.
