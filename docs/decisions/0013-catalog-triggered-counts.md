# Decision 0013: Catalog-triggered common-group counts

Date: 2026-09-13. Status: ACCEPTED — requested by the owner.

## Decision

After Contacts or Dialogs finishes loading, enqueue every person in that source for the existing
durable common-group scan. The catalog response does not wait for those per-person
queries: the browser receives the catalog first, polls while the scan is active, and fills in counts
as completed observations arrive.

Opening an already authorized workspace also asks the server once to enqueue every persisted catalog
identity. This resumes missing or interrupted counts after a page reload without requiring the owner
to toggle either source. Completed observations remain no-op cache hits.

If another source is loaded during a scan, let the current Telegram request settle, cancel the
worker at its persisted checkpoint, perform catalog discovery, and then resume unfinished people
alongside the newly loaded source. Previously completed observations remain cached and are reused.

## Consequences

- Common-group sorting becomes useful without requiring people to be selected first.
- Large catalogs can produce long-running background scans and Telegram flood waits; work remains
  sequential, cancellable, resumable, and explicit in the existing scan status UI.
- Selecting people still expands the same queue, but selection is no longer the only scan trigger.
- Loading a second source does not overlap catalog and common-group Telegram requests.
