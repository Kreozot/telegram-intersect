import bigInt from "big-integer";
import { Api } from "teleproto";
import type { PersonSource } from "../../shared/contracts.js";
import type { StoredPerson } from "../storage/repository.js";

/** Extracts eligible identity and a narrow server-only photo locator, excluding all other fields. */
export function normalizePerson(user: Api.TypeUser, source: PersonSource): StoredPerson | null {
  if (
    !(user instanceof Api.User) ||
    user.bot ||
    user.self ||
    user.deleted ||
    user.min ||
    user.accessHash === undefined
  )
    return null;
  const photo = user.photo instanceof Api.UserProfilePhoto ? user.photo : null;
  return {
    id: `user:${user.id.toString()}`,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Unnamed person",
    username: user.username ?? null,
    sources: [source],
    accessHash: user.accessHash.toString(),
    ...(photo ? { photo: { id: photo.photoId.toString(), dcId: photo.dcId } } : {}),
  };
}

export interface DialogPage {
  people: StoredPerson[];
  next: { date: number; id: number; peer: Api.TypeInputPeer } | null;
}

/** Reduces a dialog page immediately to identities and an ephemeral pagination cursor, then clears messages. */
export function normalizeDialogs(response: Api.messages.TypeDialogs): DialogPage {
  if (response instanceof Api.messages.DialogsNotModified) return { people: [], next: null };
  try {
    const privateIds = new Set(
      response.dialogs.flatMap((dialog) =>
        dialog instanceof Api.Dialog && dialog.peer instanceof Api.PeerUser
          ? [dialog.peer.userId.toString()]
          : [],
      ),
    );
    const peopleById = new Map(
      response.users.flatMap((user) => {
        const person = normalizePerson(user, "dialogs");
        return person && privateIds.has(user.id.toString())
          ? [[user.id.toString(), person] as const]
          : [];
      }),
    );
    const people = response.dialogs.flatMap((dialog) => {
      if (!(dialog instanceof Api.Dialog) || !(dialog.peer instanceof Api.PeerUser)) return [];
      const person = peopleById.get(dialog.peer.userId.toString());
      return person ? [person] : [];
    });
    if (!(response instanceof Api.messages.DialogsSlice) || response.dialogs.length === 0)
      return { people, next: null };
    const last = [...response.dialogs].reverse().find((dialog) => dialog instanceof Api.Dialog);
    if (!(last instanceof Api.Dialog)) throw new Error("Cannot paginate this dialog page.");
    const peer = last.peer;
    const lastMessage = response.messages.find(
      (message) =>
        message.id === last.topMessage && "peerId" in message && samePeer(message.peerId, peer),
    );
    if (!lastMessage || !("date" in lastMessage)) throw new Error("Missing dialog cursor.");
    let input: Api.TypeInputPeer;
    if (peer instanceof Api.PeerUser) {
      const user = response.users.find((user) => user.id.eq(peer.userId));
      if (!(user instanceof Api.User) || user.accessHash === undefined)
        throw new Error("Missing user cursor.");
      input = new Api.InputPeerUser({
        userId: peer.userId,
        accessHash: user.accessHash,
      });
    } else if (peer instanceof Api.PeerChat) input = new Api.InputPeerChat({ chatId: peer.chatId });
    else {
      const chat = response.chats.find((chat) => chat.id.eq(peer.channelId));
      if (!(chat instanceof Api.Channel) || chat.accessHash === undefined)
        throw new Error("Missing group cursor.");
      input = new Api.InputPeerChannel({
        channelId: peer.channelId,
        accessHash: chat.accessHash,
      });
    }
    return {
      people,
      next: { date: lastMessage.date, id: last.topMessage, peer: input },
    };
  } finally {
    response.messages.length = 0;
  }
}

/** Compares peer namespaces as well as IDs, avoiding user/chat ID collisions in cursor lookup. */
function samePeer(left: Api.TypePeer, right: Api.TypePeer): boolean {
  if (left instanceof Api.PeerUser && right instanceof Api.PeerUser)
    return left.userId.eq(right.userId);
  if (left instanceof Api.PeerChat && right instanceof Api.PeerChat)
    return left.chatId.eq(right.chatId);
  return (
    left instanceof Api.PeerChannel &&
    right instanceof Api.PeerChannel &&
    left.channelId.eq(right.channelId)
  );
}

/** Converts a normalized person into an exact 64-bit Telegram input identity. */
export function inputUser(person: StoredPerson): Api.InputUser {
  return new Api.InputUser({
    userId: bigInt(person.id.slice(5)),
    accessHash: bigInt(person.accessHash),
  });
}
