import type { WorkspaceEvent } from "../shared/contracts.js";

interface SequencedWorkspaceEvent {
  id: number;
  event: WorkspaceEvent;
}

/** Retains a bounded event tail so SSE reconnects can replay changes without full snapshots. */
export class WorkspaceEvents {
  private revision = 0;
  private readonly history: SequencedWorkspaceEvent[] = [];
  private readonly listeners = new Set<(entry: SequencedWorkspaceEvent) => void>();

  /** Publishes one normalized browser-safe delta and retains it for short reconnect gaps. */
  publish(event: WorkspaceEvent): void {
    const entry = { id: ++this.revision, event };
    this.history.push(entry);
    if (this.history.length > 1000) this.history.shift();
    for (const listener of this.listeners) listener(entry);
  }

  /** Subscribes an SSE response and replays retained events newer than its last acknowledged ID. */
  subscribe(afterId: number, listener: (entry: SequencedWorkspaceEvent) => void): () => void {
    const oldestId = this.history[0]?.id;
    if (afterId > 0 && oldestId !== undefined && afterId < oldestId - 1) {
      listener({ id: this.revision, event: { type: "resync" } });
    } else {
      for (const entry of this.history) if (entry.id > afterId) listener(entry);
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
