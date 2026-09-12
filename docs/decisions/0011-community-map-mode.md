# Decision 0011: People and community map modes

Status: ACCEPTED — requested by the owner on 2026-09-12.
Date: 2026-09-12.

## Decision

Provide separate People and Communities selection modes over the same observed person–community
membership data. People mode selects people and presents their observed communities. Communities
mode selects communities and presents the people observed across them, so a person's count is the
number of selected communities connected to that person.

Replace catalog-loading buttons and source tabs with persistent Contacts and Dialogs checkboxes.
Both are disabled on a browser's first use. Enabling a source loads or refreshes that catalog and
shows its people; disabling it only hides those people. A person available through either enabled
source remains visible. The source filter also limits the people included in Communities maps.

The Communities catalog is the deduplicated set of groups already observed by common-chat scans.
This mode does not import chat participant lists, request message history, or infer members that have
not been observed through a person scan.

## Consequences

- People and community selections are independent when switching modes.
- Intersection filtering applies to communities shared by selected people in People mode and to
  people observed in multiple selected communities in Communities mode.
- A newly loaded catalog can contain people whose communities are not available until those people
  have been selected and scanned in People mode.
- Browser-local source preferences survive reloads without changing server-side catalog data.
