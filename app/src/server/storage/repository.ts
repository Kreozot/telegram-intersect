import { DatabaseSync } from "node:sqlite";
import type { Person, Scan } from "../../shared/contracts.js";
import { seal, unseal } from "./vault.js";

export interface StoredPerson extends Person {
  accessHash: string;
}

/** Owns SQLite storage for allowlisted metadata and encrypted credentials; never accepts protocol responses. */
export class Repository {
  private readonly db: DatabaseSync;
  /** Opens the single-owner database and creates the initial versioned schema. */
  constructor(
    path: string,
    private readonly key: Buffer,
  ) {
    this.db = new DatabaseSync(path);
    const version = this.db.prepare("PRAGMA user_version").get();
    if (Number(version?.user_version ?? 0) > 1) {
      this.db.close();
      throw new Error("Database was created by a newer application version.");
    }
    this.db.exec(
      "PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version=1;",
    );
  }
  /** Reads a typed internal record previously written by this repository. */
  private read<T>(key: string): T | null {
    const row = this.db.prepare("SELECT value FROM state WHERE key=?").get(key);
    return row ? (JSON.parse(String(row.value)) as T) : null;
  }
  /** Writes an internal record atomically; callers must supply normalized domain data. */
  private write(key: string, value: unknown): void {
    this.db
      .prepare("INSERT INTO state VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(key, JSON.stringify(value));
  }
  /** Returns only public person metadata for catalog responses. */
  people(): Person[] {
    return this.storedPeople().map(({ id, name, username, sources }) => ({
      id,
      name,
      username,
      sources,
    }));
  }
  /** Returns server-only input-user metadata needed to query common groups. */
  storedPeople(): StoredPerson[] {
    return this.read<StoredPerson[]>("people") ?? [];
  }
  /** Replaces the catalog after complete discovery using a field allowlist. */
  savePeople(people: StoredPerson[]): void {
    this.write(
      "people",
      people.map(({ id, name, username, sources, accessHash }) => ({
        id,
        name,
        username,
        sources,
        accessHash,
      })),
    );
  }
  /** Reads the current job, including partial observations retained on cancellation. */
  scan(): Scan | null {
    return this.read<Scan>("scan");
  }
  /** Saves only typed scan fields, excluding arbitrary provider data. */
  saveScan(scan: Scan): void {
    const normalized: Scan = {
      id: scan.id,
      createdAt: scan.createdAt,
      running: scan.running,
      people: scan.people.map((p) => ({
        personId: p.personId,
        status: p.status,
        cursor: p.cursor,
        error: p.error,
        retryAt: p.retryAt,
        observedAt: p.observedAt,
        groups: p.groups.map(({ id, title }) => ({ id, title })),
      })),
    };
    this.write("scan", normalized);
    if (!scan.running && scan.people.every((p) => p.status === "completed"))
      this.write("completed-scan", normalized);
  }
  /** Retrieves the last fully completed snapshot independently of an interrupted refresh. */
  completedScan(): Scan | null {
    return this.read<Scan>("completed-scan");
  }
  /** Persists just the encrypted authorization string, never login inputs. */
  saveSession(session: string): void {
    this.write("session", seal(session, this.key));
  }
  /** Decrypts the authorization string for the Telegram adapter. */
  session(): string {
    const value = this.read<string>("session");
    return value ? unseal(value, this.key) : "";
  }
  /** Removes cached graph/catalog data while retaining the connected session. */
  clearAnalysis(): void {
    this.db.exec("DELETE FROM state WHERE key != 'session'; VACUUM;");
  }
  /** Removes all account data after logout or explicit local forgetting. */
  clearAll(): void {
    this.db.exec("DELETE FROM state; VACUUM;");
  }
  /** Releases SQLite resources at server shutdown and in tests. */
  close(): void {
    this.db.close();
  }
}
