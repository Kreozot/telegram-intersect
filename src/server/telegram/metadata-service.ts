import { setTimeout as pause } from "node:timers/promises";
import bigInt from "big-integer";
import { Api } from "teleproto";
import { FloodWaitError } from "teleproto/errors/index.js";
import type { PersonSource } from "../../shared/contracts.js";
import { RequestError } from "../request-error.js";
import type { Repository, StoredPerson } from "../storage/repository.js";
import type { AvatarService, StoredGroupPhoto } from "./avatar-service.js";
import { type GroupPage, RateLimitError, type TelegramGateway } from "./gateway.js";
import { inputUser, normalizeDialogs, normalizePerson } from "./normalize.js";
import type { PrivacyClient } from "./privacy-client.js";

/** Retrieves catalog identities and common-group pages without owning authentication or scan scheduling. */
export class MetadataService implements TelegramGateway {
  private loading = false;
  private cooldown = 0;
  /** Receives a narrow authorized-client provider, keeping session lifecycle outside metadata retrieval. */
  constructor(
    private readonly repo: Repository,
    private readonly requireClient: () => PrivacyClient,
    private readonly avatars?: AvatarService,
  ) {
    this.cooldown = Math.max(
      0,
      ...(repo.scan()?.people.map((person) => person.retryAt ?? 0) ?? []),
    );
  }
  /** Prevents conflicting deletion, scanning, and source refresh operations. */
  assertIdle(): void {
    if (this.loading) throw new RequestError("Wait for catalog discovery to finish.");
  }
  /** Discovers identities from one selected source and only commits a complete normalized catalog. */
  async loadPeople(source: PersonSource): Promise<void> {
    const client = this.requireClient();
    if (this.loading) throw new RequestError("Catalog discovery is already running.");
    if (Date.now() < this.cooldown)
      throw new RequestError("Telegram requested a pause. Try catalog discovery again later.");
    this.loading = true;
    try {
      const found: StoredPerson[] = [];
      if (source === "contacts") {
        const result = await client.invoke(new Api.contacts.GetContacts({ hash: bigInt.zero }));
        if (result instanceof Api.contacts.ContactsNotModified) return;
        if (!(result instanceof Api.contacts.ContactsNotModified))
          for (const user of result.users) {
            const person = normalizePerson(user, source);
            if (person) found.push(person);
          }
      } else {
        let dialogOrder = 0;
        const discoveredDialogIds = new Set<string>();
        for (const folderId of [0, 1]) {
          let cursor: { date: number; id: number; peer: Api.TypeInputPeer } = {
            date: 0,
            id: 0,
            peer: new Api.InputPeerEmpty(),
          };
          const seen = new Set<string>();
          while (true) {
            const raw = await client.invoke(
              new Api.messages.GetDialogs({
                folderId,
                offsetDate: cursor.date,
                offsetId: cursor.id,
                offsetPeer: cursor.peer,
                limit: 100,
                hash: bigInt.zero,
                excludePinned: cursor.id !== 0,
              }),
            );
            const page = normalizeDialogs(raw);
            for (const person of page.people) {
              if (discoveredDialogIds.has(person.id)) continue;
              discoveredDialogIds.add(person.id);
              found.push({ ...person, dialogOrder });
              dialogOrder++;
            }
            if (!page.next) break;
            const identity = JSON.stringify([
              page.next.date,
              page.next.id,
              page.next.peer.toJSON(),
            ]);
            if (seen.has(identity))
              throw new RequestError("Catalog pagination stopped making progress.");
            seen.add(identity);
            cursor = page.next;
            await pause(500);
          }
        }
      }
      const merged = new Map<string, StoredPerson>();
      for (const existing of this.repo.storedPeople()) {
        const sources = existing.sources.filter((entry) => entry !== source);
        if (sources.length) {
          const { dialogOrder: oldDialogOrder, ...rest } = existing;
          merged.set(existing.id, {
            ...rest,
            sources,
            ...(source !== "dialogs" && oldDialogOrder !== undefined
              ? { dialogOrder: oldDialogOrder }
              : {}),
          });
        }
      }
      for (const person of found) {
        const existing = merged.get(person.id);
        const dialogOrder = person.dialogOrder ?? existing?.dialogOrder;
        merged.set(person.id, {
          ...person,
          sources: [...new Set([...(existing?.sources ?? []), source])],
          ...(dialogOrder !== undefined ? { dialogOrder } : {}),
        });
      }
      const people = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
      this.repo.savePeople(people);
      this.repo.pruneAvatars(people);
      this.avatars?.enqueue(people);
    } catch (error) {
      if (error instanceof FloodWaitError) this.cooldown = Date.now() + error.seconds * 1000;
      throw new RequestError(
        error instanceof FloodWaitError
          ? `Telegram requested a ${error.seconds}-second pause. Retry later; existing data was preserved.`
          : "People could not be loaded. Existing data was preserved.",
      );
    } finally {
      this.loading = false;
    }
  }
  /** Retrieves one page of accessible common groups and translates rate limits for the durable scanner. */
  async commonGroups(person: StoredPerson, cursor: string): Promise<GroupPage> {
    if (Date.now() < this.cooldown)
      throw new RateLimitError(Math.ceil((this.cooldown - Date.now()) / 1000));
    try {
      const result = await this.requireClient().invoke(
        new Api.messages.GetCommonChats({
          userId: inputUser(person),
          maxId: bigInt(cursor),
          limit: 100,
        }),
      );
      const photoGroups: StoredGroupPhoto[] = [];
      const groups = result.chats.flatMap((chat) => {
        if (
          !(
            chat instanceof Api.Chat ||
            (chat instanceof Api.Channel && (chat.megagroup || chat.gigagroup))
          )
        )
          return [];
        const id = `${chat instanceof Api.Chat ? "chat" : "channel"}:${chat.id}`;
        if (
          chat.photo instanceof Api.ChatPhoto &&
          (chat instanceof Api.Chat || chat.accessHash !== undefined)
        ) {
          this.repo.markGroupWithAvatar(id);
          photoGroups.push({
            id,
            ...(chat instanceof Api.Channel && chat.accessHash !== undefined
              ? { accessHash: chat.accessHash.toString() }
              : {}),
            photo: { id: chat.photo.photoId.toString(), dcId: chat.photo.dcId },
          });
        } else if (!(chat.photo instanceof Api.ChatPhoto)) this.repo.markGroupWithoutAvatar(id);
        return [{ id, title: chat.title }];
      });
      this.avatars?.enqueueGroups(photoGroups);
      const last = result.chats.at(-1);
      return {
        groups,
        nextCursor:
          (result instanceof Api.messages.ChatsSlice || result.chats.length >= 100) && last
            ? last.id.toString()
            : null,
      };
    } catch (error) {
      if (error instanceof FloodWaitError) {
        this.cooldown = Date.now() + error.seconds * 1000;
        throw new RateLimitError(error.seconds);
      }
      throw error;
    }
  }
}
