import type { Person, PersonSource, Scan } from "../shared/contracts.js";

interface CatalogRepository {
  scan(): Scan | null;
  people(): Person[];
}

interface CatalogLoader {
  loadPeople(source: PersonSource): Promise<void>;
}

interface CatalogScanQueue {
  cancel(): Promise<void>;
  enqueue(ids: string[]): Scan;
}

/** Queues every persisted catalog identity, while treating an empty catalog as a harmless no-op. */
export function queueCatalogCounts(repo: CatalogRepository, scans: CatalogScanQueue): Scan | null {
  const ids = repo.people().map((person) => person.id);
  return ids.length > 0 ? scans.enqueue(ids) : repo.scan();
}

/**
 * Refreshes one catalog source and queues common-group counts without overlapping Telegram work.
 * An active scan is allowed to finish its current request, then its unfinished people are resumed
 * alongside every identity returned for the refreshed source.
 */
export async function refreshCatalogAndQueueCounts(
  source: PersonSource,
  repo: CatalogRepository,
  metadata: CatalogLoader,
  scans: CatalogScanQueue,
): Promise<void> {
  const currentScan = repo.scan();
  const interruptedIds = currentScan?.running
    ? currentScan.people
        .filter((person) => person.status !== "completed")
        .map((person) => person.personId)
    : [];
  if (currentScan?.running) await scans.cancel();

  let loaded = false;
  try {
    await metadata.loadPeople(source);
    loaded = true;
  } finally {
    const availablePeople = repo.people();
    const availableIds = new Set(availablePeople.map((person) => person.id));
    const ids = new Set(interruptedIds.filter((id) => availableIds.has(id)));
    if (loaded) {
      for (const person of availablePeople) if (person.sources.includes(source)) ids.add(person.id);
    }
    if (ids.size > 0) scans.enqueue([...ids]);
  }
}
