# Product requirements

## Confirmed requirements

- Build a full-stack Telegram user client with a browser UI and a server listening on a configurable port; support local and server deployment.
- Sign in with a regular Telegram account and analyze shared communities, rather than implement messaging.
- Select individuals from saved contacts or private conversations; provide select-all actions for both sources and their deduplicated union.
- Switch between People and Communities map modes. Communities mode selects previously observed
  chats and shows observed people as their shared elements.
- Use persistent Contacts and Dialogs source checkboxes to load and show catalog identities; apply
  the same source visibility to people shown in Communities maps.
- Visualize people, groups, and their intersections using an existing free graph library.
- Show how many selected people belong to each discovered shared group and allow inspecting those people.
- Provide a polished UI with light and dark themes using an appropriate component kit.
- Use TypeScript throughout, detailed types, SRP, JSDoc, atomic components, colocated stylesheet files, and Biome.
- Maintain English documentation for planning, architecture, coding practices, style, and agent workflow. Approve key stack choices before implementing them.

## Approved first-release scope

- One owner and one connected Telegram account per deployment. Hosted access still requires an application authentication boundary. Multi-user hosting requires a separate approved design.
- Source selection, search, deduplication, catalog- and selection-triggered background scans, scan
  progress, cancellation, partial-result recovery, and refresh.
- A configurable simultaneous people-selection limit, defaulting to 50.
- Static profile avatars loaded in the background with local cache-first display and initials fallback.
- Static community avatars loaded from observed common chats with the same private cache-first model,
  shown in the community lens and always visible on graph nodes when available.
- A bipartite person–group graph, group counts, neighborhood highlighting, and a details panel. A group–group projection may follow: edge weight means the number of selected people observed in both groups.
- Group selection filters the graph. Importing all participants of a selected group is a separate, unapproved feature whose completeness depends on API access.
- Include archived private dialogs when available. Exclude bots, self, and deleted accounts from the default people selection; explain exclusions.
- Treat private dialog existence as the selection criterion; do not promise proof of a two-way conversation or recovery of deleted dialogs.
- No message-history harvesting or message sending is needed for the analysis. Dialog responses may include message fields; discard unneeded content.
- The initial UI uses English; documentation and code comments are English.

## Telegram feasibility and limits

The user-only [messages.getCommonChats](https://core.telegram.org/method/messages.getCommonChats) method returns chats in common with a target user and supports pagination. It is the primary candidate for the requested graph. This is an observation of accessible shared chats, not a complete social network or evidence that two people know each other.

An application needs its own [api_id and api_hash](https://core.telegram.org/api/obtaining_api_id). [Authorization](https://core.telegram.org/api/auth) supports several delivery mechanisms; an SMS code cannot be guaranteed for third-party clients. QR and phone/code with 2FA are implemented but still require live-account verification. Email setup, CAPTCHA, and registration flows are not implemented.

The owner explicitly approved immediately discarding incidental top messages returned by dialog discovery, with no storage or browser transmission.

Each person needs a distinct result status: not scanned, queued, scanning, completed, waiting, failed, or cancelled. Store scan timestamps and completeness. A failed or unfinished request must never mean zero shared groups. Counts describe selected people with observed memberships, not total group membership. Never infer a negative membership from missing partial results.

Loading Contacts or Dialogs adds every person in that source to a durable adaptive common-group
queue after the catalog response completes. Selecting people can also expand that queue after a short
debounce. Opening an authorized workspace queues missing persisted-catalog observations without
requiring a source reload. Previously completed observations are reused, and removing a person affects
graph visibility without discarding saved results or interrupting an in-flight request.

## Acceptance examples

- If Alice shares groups X and Y, and Bob shares Y, show three membership edges and counts X=1, Y=2.
- A person in contacts and dialogs appears once, with both source flags.
- A cancelled or rate-limited scan retains observed edges and visibly marks incomplete coverage.
- Selecting a group reveals its observed selected people; selecting a person highlights their shared groups.
- Reload, logout, and data deletion have documented session/cache behavior. Hosted private data
  requires application authorization; loopback-only installations authorize the local owner
  automatically while retaining host, origin, and mutation-request checks.
