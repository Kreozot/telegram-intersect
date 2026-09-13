import { Api } from "teleproto";
import type { CachedAvatar, Repository, StoredPerson } from "../storage/repository.js";
import type { WorkspaceEvents } from "../workspace-events.js";
import type { PrivacyClient } from "./privacy-client.js";

const MAX_AVATAR_BYTES = 512 * 1024;

export interface StoredGroupPhoto {
  id: string;
  accessHash?: string;
  photo: { id: string; dcId: number };
}

type PendingAvatar =
  | { kind: "person"; person: StoredPerson }
  | { kind: "group"; group: StoredGroupPhoto };

/** Downloads and validates static profile thumbnails in a non-blocking, sequential queue. */
export class AvatarService {
  private pending = new Map<string, PendingAvatar>();
  private running = false;
  private closed = false;

  /** Receives normalized people after catalog commit and schedules only missing photo revisions. */
  constructor(
    private readonly repo: Repository,
    private readonly requireClient: () => PrivacyClient,
    private readonly events?: WorkspaceEvents,
  ) {}

  /** Reports whether background avatar work can still change a browser snapshot. */
  isRunning(): boolean {
    return this.running || this.pending.size > 0;
  }

  /** Adds cache misses to the background queue without delaying catalog responses. */
  enqueue(people: readonly StoredPerson[]): void {
    if (this.closed) return;
    for (const person of people) {
      if (!person.photo || this.repo.avatar(person.id)?.photoId === person.photo.id) continue;
      this.pending.set(person.id, { kind: "person", person });
    }
    if (!this.running) void this.drain();
  }

  /** Adds newly observed group-photo revisions to the same bounded sequential queue. */
  enqueueGroups(groups: readonly StoredGroupPhoto[]): void {
    if (this.closed) return;
    for (const group of groups) {
      if (this.repo.avatar(group.id)?.photoId === group.photo.id) continue;
      this.pending.set(group.id, { kind: "group", group });
    }
    if (!this.running) void this.drain();
  }

  /** Prevents new work during server shutdown; an in-flight request may finish harmlessly. */
  close(): void {
    this.closed = true;
    this.pending.clear();
  }

  /** Processes one thumbnail at a time so avatar traffic does not compete aggressively with scans. */
  private async drain(): Promise<void> {
    this.running = true;
    this.events?.publish({ type: "avatar-state", running: true });
    try {
      while (!this.closed) {
        const next = this.pending.entries().next().value as [string, PendingAvatar] | undefined;
        if (!next) break;
        const [entityId, pending] = next;
        this.pending.delete(entityId);
        try {
          const avatar = await this.download(pending);
          if (avatar && !this.closed) {
            if (pending.kind === "group") {
              this.repo.saveAvatar(avatar);
              this.publishAvatar(avatar);
            } else {
              const current = this.repo.storedPeople().find((entry) => entry.id === entityId);
              if (current?.photo?.id === avatar.photoId) {
                this.repo.saveAvatar(avatar);
                this.publishAvatar(avatar);
              }
            }
          }
        } catch {
          // Avatar failures are intentionally isolated from catalog discovery and existing cache.
        }
      }
    } finally {
      this.running = false;
      this.events?.publish({ type: "avatar-state", running: false });
    }
  }

  /** Notifies browsers of one cache revision without retransmitting the catalog or scan. */
  private publishAvatar(avatar: CachedAvatar): void {
    this.events?.publish({
      type: "avatar",
      entityId: avatar.entityId,
      avatarUrl: `/api/avatars/${encodeURIComponent(avatar.entityId)}?v=${encodeURIComponent(avatar.photoId)}`,
    });
  }

  /** Fetches the small profile-photo rendition and accepts only bounded static bitmap formats. */
  private async download(pending: PendingAvatar): Promise<CachedAvatar | null> {
    const response =
      pending.kind === "person"
        ? await this.downloadPerson(pending.person)
        : await this.requireClient().downloadGroupThumbnail(
            pending.group.id,
            pending.group.accessHash,
            pending.group.photo.id,
            pending.group.photo.dcId,
            MAX_AVATAR_BYTES,
          );
    if (!(response instanceof Api.upload.File) || response.bytes.length >= MAX_AVATAR_BYTES)
      return null;
    const bytes = Buffer.from(response.bytes);
    const contentType = detectStaticImage(bytes);
    return contentType
      ? {
          entityId: pending.kind === "person" ? pending.person.id : pending.group.id,
          photoId:
            pending.kind === "person" ? (pending.person.photo?.id ?? "") : pending.group.photo.id,
          contentType,
          bytes,
        }
      : null;
  }

  /** Requests a person's small profile rendition using its server-only locator. */
  private downloadPerson(person: StoredPerson): Promise<Api.upload.TypeFile> {
    if (!person.photo) throw new Error("Person has no profile photo.");
    return this.requireClient().downloadProfileThumbnail(
      person.id.slice(5),
      person.accessHash,
      person.photo.id,
      person.photo.dcId,
      MAX_AVATAR_BYTES,
    );
  }
}

/** Recognizes only the static formats served by the avatar endpoint. */
function detectStaticImage(bytes: Buffer): CachedAvatar["contentType"] | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}
