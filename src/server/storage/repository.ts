import { DatabaseSync } from "node:sqlite";
import type { Person, Scan } from "../../shared/contracts.js";
import { seal, unseal } from "./vault.js";

export interface StoredPerson extends Person {
  accessHash: string;
  photo?: StoredProfilePhoto;
}

export interface StoredProfilePhoto {
  id: string;
  dcId: number;
}

export interface CachedAvatar {
  entityId: string;
  photoId: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Buffer;
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
    if (Number(version?.user_version ?? 0) > 4) {
      this.db.close();
      throw new Error("Database was created by a newer application version.");
    }
    this.db.exec(
      "PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS avatars (person_id TEXT PRIMARY KEY, photo_id TEXT NOT NULL, content_type TEXT NOT NULL, bytes BLOB NOT NULL); CREATE TABLE IF NOT EXISTS group_avatar_absences (group_id TEXT PRIMARY KEY); PRAGMA user_version=4;",
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
    const avatars = new Map<string, string>(
      this.db
        .prepare("SELECT person_id, photo_id FROM avatars")
        .all()
        .map((row) => [String(row.person_id), String(row.photo_id)] as const),
    );
    return this.storedPeople().map(({ id, name, username, sources, dialogOrder }) => ({
      id,
      name,
      username,
      sources,
      ...(dialogOrder !== undefined ? { dialogOrder } : {}),
      ...(avatars.has(id)
        ? {
            avatarUrl: `/api/avatars/${encodeURIComponent(id)}?v=${encodeURIComponent(avatars.get(id) ?? "")}`,
          }
        : {}),
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
      people.map(({ id, name, username, sources, dialogOrder, accessHash, photo }) => ({
        id,
        name,
        username,
        sources,
        ...(dialogOrder !== undefined ? { dialogOrder } : {}),
        accessHash,
        ...(photo ? { photo: { id: photo.id, dcId: photo.dcId } } : {}),
      })),
    );
  }
  /** Reads one cached static avatar without exposing its Telegram file location. */
  avatar(entityId: string): CachedAvatar | null {
    const row = this.db
      .prepare("SELECT person_id, photo_id, content_type, bytes FROM avatars WHERE person_id=?")
      .get(entityId);
    if (!row) return null;
    const contentType = String(row.content_type);
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;
    return {
      entityId: String(row.person_id),
      photoId: String(row.photo_id),
      contentType: contentType as CachedAvatar["contentType"],
      bytes: Buffer.from(row.bytes as Uint8Array),
    };
  }
  /** Atomically replaces a person's cached avatar after static-image validation. */
  saveAvatar(avatar: CachedAvatar): void {
    this.db
      .prepare(
        "INSERT INTO avatars VALUES (?,?,?,?) ON CONFLICT(person_id) DO UPDATE SET photo_id=excluded.photo_id, content_type=excluded.content_type, bytes=excluded.bytes",
      )
      .run(avatar.entityId, avatar.photoId, avatar.contentType, avatar.bytes);
  }
  /** Removes a cached image when Telegram explicitly reports that an entity has no photo. */
  deleteAvatar(entityId: string): void {
    this.db.prepare("DELETE FROM avatars WHERE person_id=?").run(entityId);
  }
  /** Records Telegram's explicit no-photo result so legacy scans are not refreshed repeatedly. */
  markGroupWithoutAvatar(groupId: string): void {
    this.db.prepare("INSERT OR IGNORE INTO group_avatar_absences VALUES (?)").run(groupId);
    this.deleteAvatar(groupId);
  }
  /** Clears a prior no-photo marker when Telegram exposes a current group photo. */
  markGroupWithAvatar(groupId: string): void {
    this.db.prepare("DELETE FROM group_avatar_absences WHERE group_id=?").run(groupId);
  }
  /** Detects legacy group records whose photo availability has never been observed. */
  groupsNeedAvatarDiscovery(groups: readonly { id: string; avatarUrl?: string }[]): boolean {
    const absent = new Set(
      this.db
        .prepare("SELECT group_id FROM group_avatar_absences")
        .all()
        .map((row) => String(row.group_id)),
    );
    return groups.some((group) => !group.avatarUrl && !absent.has(group.id));
  }
  /** Drops cached avatars for identities or photos no longer present in the catalog. */
  pruneAvatars(people: readonly StoredPerson[]): void {
    const current = new Map(people.map((person) => [person.id, person.photo?.id]));
    for (const row of this.db.prepare("SELECT person_id, photo_id FROM avatars").all()) {
      const personId = String(row.person_id);
      if (
        personId.startsWith("user:") &&
        (!current.has(personId) || current.get(personId) === undefined)
      )
        this.db.prepare("DELETE FROM avatars WHERE person_id=?").run(personId);
    }
  }
  /** Reads the current job, including partial observations retained on cancellation. */
  scan(): Scan | null {
    return this.withGroupAvatars(this.read<Scan>("scan"));
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
    return this.withGroupAvatars(this.read<Scan>("completed-scan"));
  }
  /** Adds authenticated cache URLs to public group records without persisting browser URLs. */
  private withGroupAvatars(scan: Scan | null): Scan | null {
    if (!scan) return null;
    const revisions = new Map<string, string>(
      this.db
        .prepare(
          "SELECT person_id, photo_id FROM avatars WHERE person_id LIKE 'chat:%' OR person_id LIKE 'channel:%'",
        )
        .all()
        .map((row) => [String(row.person_id), String(row.photo_id)] as const),
    );
    return {
      ...scan,
      people: scan.people.map((person) => ({
        ...person,
        groups: person.groups.map((group) => {
          const revision = revisions.get(group.id);
          return revision
            ? {
                ...group,
                avatarUrl: `/api/avatars/${encodeURIComponent(group.id)}?v=${encodeURIComponent(revision)}`,
              }
            : group;
        }),
      })),
    };
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
    this.db.exec(
      "DELETE FROM state WHERE key != 'session'; DELETE FROM avatars; DELETE FROM group_avatar_absences; VACUUM;",
    );
  }
  /** Removes all account data after logout or explicit local forgetting. */
  clearAll(): void {
    this.db.exec(
      "DELETE FROM state; DELETE FROM avatars; DELETE FROM group_avatar_absences; VACUUM;",
    );
  }
  /** Releases SQLite resources at server shutdown and in tests. */
  close(): void {
    this.db.close();
  }
}
