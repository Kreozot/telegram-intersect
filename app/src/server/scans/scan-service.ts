import { randomUUID } from "node:crypto";
import type { Scan } from "../../shared/contracts.js";
import { RequestError } from "../request-error.js";
import type { Repository } from "../storage/repository.js";
import { RateLimitError, type TelegramGateway } from "../telegram/gateway.js";

/** Runs one durable, sequential membership scan without coupling HTTP requests to Telegram latency. */
export class ScanService {
  private active: Promise<void> | null = null;
  private cancelled = false;
  private wake: (() => void) | null = null;
  /** Marks interrupted work as resumable when the process restarts. */
  constructor(
    private readonly repo: Repository,
    private readonly gateway: TelegramGateway,
    private readonly interval = 1200,
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
    this.wake?.();
    await this.active;
  }
  /** Exposes the actual worker lifetime to shutdown and behavior tests. */
  async settled(): Promise<void> {
    await this.active;
  }
  /** Saves the initial job before scheduling and contains background failures. */
  private launch(scan: Scan): void {
    this.cancelled = false;
    this.repo.saveScan(scan);
    this.active = this.run(scan)
      .catch(() => {
        console.error(
          "Scan stopped because local storage could not be updated. Restart after fixing storage access.",
        );
      })
      .finally(() => {
        this.active = null;
      });
  }
  /** Waits without blocking HTTP, with an interruptible timer for cancel and shutdown. */
  private async pause(ms: number): Promise<void> {
    if (this.cancelled || ms <= 0) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.wake = null;
        resolve();
      };
      const timer = setTimeout(finish, Math.min(ms, 2_147_000_000));
      this.wake = finish;
    });
  }
  /** Paginates each selected person's shared groups and commits checkpoints after every successful page. */
  private async run(scan: Scan): Promise<void> {
    try {
      for (const result of scan.people) {
        if (result.status === "completed") continue;
        const person = this.repo.storedPeople().find((entry) => entry.id === result.personId);
        if (!person) {
          result.status = "failed";
          result.error = "Person is no longer in the catalog.";
          continue;
        }
        while (!this.cancelled && result.status !== "completed") {
          if (result.retryAt && result.retryAt > Date.now()) {
            result.status = "waiting";
            this.repo.saveScan(scan);
            await this.pause(result.retryAt - Date.now());
            if (this.cancelled) break;
            if (result.retryAt > Date.now()) continue;
          }
          result.status = "scanning";
          result.retryAt = null;
          this.repo.saveScan(scan);
          try {
            const page = await this.gateway.commonGroups(person, result.cursor);
            const groups = new Map(result.groups.map((group) => [group.id, group]));
            for (const group of page.groups) groups.set(group.id, group);
            result.groups = [...groups.values()];
            result.observedAt = new Date().toISOString();
            if (page.nextCursor === null) result.status = "completed";
            else if (page.nextCursor === result.cursor)
              throw new RequestError("Repeated page cursor.");
            else result.cursor = page.nextCursor;
            this.repo.saveScan(scan);
            await this.pause(this.interval);
          } catch (error) {
            if (error instanceof RateLimitError) {
              result.status = "waiting";
              result.retryAt = Date.now() + error.seconds * 1000;
              this.repo.saveScan(scan);
            } else {
              result.status = "failed";
              result.error = "Could not finish this person. Resume to retry.";
              this.repo.saveScan(scan);
              break;
            }
          }
        }
        if (this.cancelled) break;
      }
    } finally {
      for (const person of scan.people)
        if (["queued", "scanning", "waiting"].includes(person.status)) person.status = "cancelled";
      scan.running = false;
      this.repo.saveScan(scan);
    }
  }
}
