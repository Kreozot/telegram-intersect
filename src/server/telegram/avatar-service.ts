import { Api } from "teleproto";
import type { CachedAvatar, Repository, StoredPerson } from "../storage/repository.js";
import type { PrivacyClient } from "./privacy-client.js";

const MAX_AVATAR_BYTES = 512 * 1024;

/** Downloads and validates static profile thumbnails in a non-blocking, sequential queue. */
export class AvatarService {
  private pending = new Map<string, StoredPerson>();
  private running = false;
  private closed = false;

  /** Receives normalized people after catalog commit and schedules only missing photo revisions. */
  constructor(
    private readonly repo: Repository,
    private readonly requireClient: () => PrivacyClient,
  ) {}

  /** Adds cache misses to the background queue without delaying catalog responses. */
  enqueue(people: readonly StoredPerson[]): void {
    if (this.closed) return;
    for (const person of people) {
      if (!person.photo || this.repo.avatar(person.id)?.photoId === person.photo.id) continue;
      this.pending.set(person.id, person);
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
    try {
      while (!this.closed) {
        const next = this.pending.entries().next().value as [string, StoredPerson] | undefined;
        if (!next) break;
        const [personId, person] = next;
        this.pending.delete(personId);
        try {
          const avatar = await this.download(person);
          if (avatar && !this.closed) {
            const current = this.repo.storedPeople().find((entry) => entry.id === person.id);
            if (current?.photo?.id === avatar.photoId) this.repo.saveAvatar(avatar);
          }
        } catch {
          // Avatar failures are intentionally isolated from catalog discovery and existing cache.
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Fetches the small profile-photo rendition and accepts only bounded static bitmap formats. */
  private async download(person: StoredPerson): Promise<CachedAvatar | null> {
    if (!person.photo) return null;
    const response = await this.requireClient().downloadProfileThumbnail(
      person.id.slice(5),
      person.accessHash,
      person.photo.id,
      person.photo.dcId,
      MAX_AVATAR_BYTES,
    );
    if (!(response instanceof Api.upload.File) || response.bytes.length >= MAX_AVATAR_BYTES)
      return null;
    const bytes = Buffer.from(response.bytes);
    const contentType = detectStaticImage(bytes);
    return contentType
      ? { personId: person.id, photoId: person.photo.id, contentType, bytes }
      : null;
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
