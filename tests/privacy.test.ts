import assert from "node:assert/strict";
import { test } from "node:test";
import bigInt from "big-integer";
import { Api } from "teleproto";
import { Repository } from "../src/server/storage/repository.js";
import { seal, unseal } from "../src/server/storage/vault.js";
import { normalizeDialogs, normalizePerson } from "../src/server/telegram/normalize.js";
import { assertAllowedRequest, PrivacyClient } from "../src/server/telegram/privacy-client.js";

test("normalizes people without phone, photo, message content, or unsafe numeric IDs", () => {
  const user = new Api.User({
    id: bigInt("9007199254740993"),
    accessHash: bigInt("987654321"),
    firstName: "Alice",
    phone: "private-phone",
  });
  const person = normalizePerson(user, "contacts");
  assert.equal(person?.id, "user:9007199254740993");
  assert.deepEqual(Object.keys(person ?? {}).sort(), [
    "accessHash",
    "id",
    "name",
    "sources",
    "username",
  ]);
  assert.equal(JSON.stringify(person).includes("private-phone"), false);
});

test("retains only the server-side locator needed for a static profile thumbnail", () => {
  const user = new Api.User({
    id: bigInt(7),
    accessHash: bigInt(8),
    firstName: "Alice",
    photo: new Api.UserProfilePhoto({ photoId: bigInt(9), dcId: 4, hasVideo: true }),
  });
  const person = normalizePerson(user, "contacts");
  assert.deepEqual(person?.photo, { id: "9", dcId: 4 });
  assert.equal(JSON.stringify(person).includes("hasVideo"), false);
});

test("dialog normalization clears message objects and retains only matching private dialog people", () => {
  const alice = new Api.User({
    id: bigInt(1),
    accessHash: bigInt(2),
    firstName: "Alice",
  });
  const bob = new Api.User({
    id: bigInt(3),
    accessHash: bigInt(4),
    firstName: "Bob",
  });
  const response = new Api.messages.Dialogs({
    dialogs: [
      new Api.Dialog({
        peer: new Api.PeerUser({ userId: bigInt(3) }),
        topMessage: 8,
        readInboxMaxId: 0,
        readOutboxMaxId: 0,
        unreadCount: 0,
        unreadMentionsCount: 0,
        unreadReactionsCount: 0,
        unreadPollVotesCount: 0,
        notifySettings: new Api.PeerNotifySettings({}),
      }),
      new Api.Dialog({
        peer: new Api.PeerUser({ userId: bigInt(1) }),
        topMessage: 7,
        readInboxMaxId: 0,
        readOutboxMaxId: 0,
        unreadCount: 0,
        unreadMentionsCount: 0,
        unreadReactionsCount: 0,
        unreadPollVotesCount: 0,
        notifySettings: new Api.PeerNotifySettings({}),
      }),
    ],
    messages: [
      new Api.Message({
        id: 8,
        peerId: new Api.PeerUser({ userId: bigInt(3) }),
        date: 1235,
        message: "ANOTHER_PRIVATE_MESSAGE_SENTINEL",
      }),
      new Api.Message({
        id: 7,
        peerId: new Api.PeerUser({ userId: bigInt(1) }),
        date: 1234,
        message: "PRIVATE_MESSAGE_SENTINEL",
      }),
    ],
    chats: [],
    users: [alice, bob],
  });
  const result = normalizeDialogs(response);
  assert.deepEqual(
    result.people.map((person) => person.id),
    ["user:3", "user:1"],
  );
  assert.equal(response.messages.length, 0);
  assert.equal(JSON.stringify(result).includes("PRIVATE_MESSAGE_SENTINEL"), false);
  assert.equal(JSON.stringify(result).includes("ANOTHER_PRIVATE_MESSAGE_SENTINEL"), false);
  assert.equal(result.next, null);
});

test("privacy boundary rejects generic media access and update recovery", async () => {
  for (const request of [
    new Api.messages.GetHistory({ peer: new Api.InputPeerSelf() }),
    new Api.messages.GetMessages({ id: [] }),
    new Api.updates.GetDifference({ pts: 0, date: 0, qts: 0 }),
    new Api.upload.GetFile({}),
  ])
    assert.throws(() => assertAllowedRequest(request), /disabled/);
  assert.doesNotThrow(() =>
    assertAllowedRequest(new Api.contacts.GetContacts({ hash: bigInt.zero })),
  );
  const client = new PrivacyClient("", 1, "test");
  let requests = 0;
  client.invoke = async () => {
    requests++;
    throw new Error("Unexpected background request");
  };
  client.updateManager.start();
  await client.updateManager.ensureState();
  await client.updateManager.catchUp();
  await client.updateManager.recoverIfStale();
  assert.equal(requests, 0);
  await client.destroy();
});

test("storage strips extra fields and session encryption rejects tampering", () => {
  const key = Buffer.alloc(32, 7);
  const repo = new Repository(":memory:", key);
  const person = {
    id: "user:1",
    name: "Alice",
    username: null,
    sources: ["contacts"] as ("contacts" | "dialogs")[],
    accessHash: "2",
    dialogOrder: 4,
    message: "PRIVATE_MESSAGE_SENTINEL",
  };
  repo.savePeople([person]);
  assert.equal(JSON.stringify(repo.storedPeople()).includes("PRIVATE_MESSAGE_SENTINEL"), false);
  assert.equal("accessHash" in (repo.people()[0] ?? {}), false);
  assert.equal(repo.people()[0]?.dialogOrder, 4);
  repo.saveAvatar({
    personId: "user:1",
    photoId: "9",
    contentType: "image/jpeg",
    bytes: Buffer.from([0xff, 0xd8, 0xff]),
  });
  assert.equal(repo.people()[0]?.avatarUrl, "/api/avatars/user%3A1?v=9");
  assert.deepEqual(repo.avatar("user:1")?.bytes, Buffer.from([0xff, 0xd8, 0xff]));
  repo.saveSession("SECRET_SESSION");
  assert.equal(repo.session(), "SECRET_SESSION");
  const ciphertext = seal("SECRET_SESSION", key);
  assert.equal(ciphertext.includes("SECRET_SESSION"), false);
  assert.throws(() => unseal(ciphertext, Buffer.alloc(32, 8)));
  repo.clearAll();
  assert.equal(repo.session(), "");
  assert.deepEqual(repo.people(), []);
  assert.equal(repo.avatar("user:1"), null);
  repo.close();
});
