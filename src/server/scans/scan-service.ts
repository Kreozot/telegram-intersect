import { randomUUID } from "node:crypto";
import type { Scan } from "../../shared/contracts.js";
import { RequestError } from "../request-error.js";
import { safeErrorDetails } from "../safe-error-details.js";
import type { Repository } from "../storage/repository.js";
import { RateLimitError, type TelegramGateway } from "../telegram/gateway.js";
import type { WorkspaceEvents } from "../workspace-events.js";

/** Runs one durable, adaptively concurrent scan without coupling HTTP requests to Telegram latency. */
export class ScanService {
  private active: Promise<void> | null = null;
  private current: Scan | null = null;
  private cancelled = false;
  private readonly wake = new Set<() => void>();
  private concurrency = 3;
  private successfulRequests = 0;
  private globalRetryAt = 0;
  /** Marks interrupted work as resumable when the process restarts. */
  constructor(
    private readonly repo: Repository,
    private readonly gateway: TelegramGateway,
    private readonly interval = 200,
    private readonly events?: WorkspaceEvents,
  ) {
    const scan = repo.scan();
    if (scan?.running) {
      scan.running = false;
      for (const person of scan.people)
        if (["queued", "scanning", "waiting"].includes(person.status)) person.status = "cancelled";
      repo.saveScan(scan);
    }
  }
  /** Creates a job for explicitly selected catalog people and starts it in the background. */
  start(ids: string[]): Scan {
    if (this.active) throw new RequestError("A scan is already running.");
    const valid = new Set(this.repo.people().map((person) => person.id));
    const unique = [...new Set(ids)];
    if (!unique.length || unique.some((id) => !valid.has(id)))
      throw new RequestError("Select available people first.");
    const scan: Scan = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      running: true,
      people: unique.map((personId) => ({
        personId,
        status: "queued",
        groups: [],
        cursor: "0",
        error: null,
        retryAt: null,
        observedAt: null,
      })),
    };
    this.launch(scan);
    return scan;
  }
  /** Adds selected people to the durable scan queue while reusing every saved observation. */
  enqueue(ids: string[]): Scan {
    const valid = new Set(this.repo.people().map((person) => person.id));
    const unique = [...new Set(ids)];
    if (!unique.length || unique.some((id) => !valid.has(id)))
      throw new RequestError("Select available people first.");
    const scan = this.current ??
      this.repo.scan() ?? {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        running: false,
        people: [],
      };
    const existing = new Map(scan.people.map((person) => [person.personId, person]));
    for (const personId of unique) {
      const result = existing.get(personId);
      if (!result) {
        scan.people.push({
          personId,
          status: "queued",
          groups: [],
          cursor: "0",
          error: null,
          retryAt: null,
          observedAt: null,
        });
      } else if (!this.active) {
        if (result.status !== "completed" || this.repo.groupsNeedAvatarDiscovery(result.groups)) {
          result.status = "queued";
          result.cursor = "0";
          result.error = null;
        }
      }
    }
    if (this.active) {
      this.repo.saveScan(scan);
      return scan;
    }
    if (scan.people.some((person) => person.status === "queued")) {
      scan.running = true;
      this.launch(scan);
    } else {
      this.repo.saveScan(scan);
    }
    return scan;
  }
  /** Resumes unfinished people using persisted page cursors while retaining completed results. */
  resume(): Scan {
    if (this.active) throw new RequestError("A scan is already running.");
    const scan = this.repo.scan();
    if (!scan || scan.people.every((person) => person.status === "completed"))
      throw new RequestError("No unfinished scan.");
    for (const person of scan.people)
      if (person.status !== "completed") {
        person.status = "queued";
        person.error = null;
      }
    scan.running = true;
    this.launch(scan);
    return scan;
  }
  /** Requests cancellation, wakes any rate-limit sleep, and waits for the current request to settle. */
  async cancel(): Promise<void> {
    this.cancelled = true;
    for (const wake of this.wake) wake();
    this.wake.clear();
    await this.active;
  }
  /** Exposes the actual worker lifetime to shutdown and behavior tests. */
  async settled(): Promise<void> {
    await this.active;
  }
  /** Saves the initial job before scheduling and contains background failures. */
  private launch(scan: Scan): void {
    this.cancelled = false;
    this.current = scan;
    this.repo.saveScan(scan);
    this.active = this.run(scan)
      .catch(() => {
        console.error(
          "Scan stopped because local storage could not be updated. Restart after fixing storage access.",
        );
      })
      .finally(() => {
        this.active = null;
        this.current = null;
      });
  }
  /** Waits without blocking HTTP, with an interruptible timer for cancel and shutdown. */
  private async pause(ms: number): Promise<void> {
    if (this.cancelled || ms <= 0) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.wake.delete(finish);
        resolve();
      };
      const timer = setTimeout(finish, Math.min(ms, 2_147_000_000));
      this.wake.add(finish);
    });
  }
  /** Persists a scan transition and emits only the changed person or compact job state. */
  private save(scan: Scan, person?: Scan["people"][number]): void {
    this.repo.saveScan(scan);
    if (person) {
      const publicPerson = this.repo
        .scan()
        ?.people.find((entry) => entry.personId === person.personId);
      this.events?.publish({
        type: "scan-person",
        scanId: scan.id,
        createdAt: scan.createdAt,
        person: structuredClone(publicPerson ?? person),
      });
    } else
      this.events?.publish({
        type: "scan-state",
        scanId: scan.id,
        createdAt: scan.createdAt,
        running: scan.running,
      });
  }
  /** Processes one person's pages while sharing adaptive flood control with the worker pool. */
  private async scanPerson(scan: Scan, result: Scan["people"][number]): Promise<void> {
    const person = this.repo.storedPeople().find((entry) => entry.id === result.personId);
    if (!person) {
      result.status = "failed";
      result.error = "Person is no longer in the catalog.";
      this.save(scan, result);
      return;
    }
    while (!this.cancelled && result.status !== "completed") {
      const retryAt = Math.max(result.retryAt ?? 0, this.globalRetryAt);
      if (retryAt > Date.now()) {
        result.status = "waiting";
        this.save(scan, result);
        await this.pause(retryAt - Date.now());
        if (this.cancelled) break;
        if (retryAt > Date.now()) continue;
      }
      result.status = "scanning";
      result.retryAt = null;
      this.save(scan, result);
      try {
        const page = await this.gateway.commonGroups(person, result.cursor);
        const groups = new Map(result.groups.map((group) => [group.id, group]));
        for (const group of page.groups) groups.set(group.id, group);
        result.groups = [...groups.values()];
        result.error = null;
        result.observedAt = new Date().toISOString();
        if (page.nextCursor === null) result.status = "completed";
        else if (page.nextCursor === result.cursor) throw new RequestError("Repeated page cursor.");
        else result.cursor = page.nextCursor;
        this.successfulRequests++;
        if (this.concurrency < 3 && this.successfulRequests >= 10) {
          this.concurrency++;
          this.successfulRequests = 0;
        }
        this.save(scan, result);
        await this.pause(this.interval > 0 ? this.interval + Math.floor(Math.random() * 150) : 0);
      } catch (error) {
        if (error instanceof RateLimitError) {
          result.status = "waiting";
          result.retryAt = Date.now() + error.seconds * 1000;
          this.globalRetryAt = Math.max(this.globalRetryAt, result.retryAt);
          this.concurrency = 1;
          this.successfulRequests = 0;
          this.save(scan, result);
        } else {
          console.error("Common-group scan failed.", safeErrorDetails(error));
          result.status = "failed";
          result.error = "Could not finish this person. Resume to retry.";
          this.save(scan, result);
          break;
        }
      }
    }
  }
  /** Paginates people with a small adaptive pool and globally honors Telegram flood waits. */
  private async run(scan: Scan): Promise<void> {
    let nextIndex = 0;
    const worker = async (slot: number): Promise<void> => {
      while (!this.cancelled) {
        while (!this.cancelled && slot >= this.concurrency) await this.pause(100);
        if (this.cancelled) return;
        const result = scan.people[nextIndex];
        if (!result) return;
        nextIndex++;
        if (result.status === "completed") continue;
        await this.scanPerson(scan, result);
      }
    };
    try {
      await Promise.all([0, 1, 2].map((slot) => worker(slot)));
    } finally {
      const cancelledPeople: Scan["people"] = [];
      for (const person of scan.people)
        if (["queued", "scanning", "waiting"].includes(person.status)) {
          person.status = "cancelled";
          cancelledPeople.push(person);
        }
      scan.running = false;
      for (const person of cancelledPeople) this.save(scan, person);
      this.save(scan);
    }
  }
}
