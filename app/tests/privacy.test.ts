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

test("dialog normalization clears message objects and retains only matching private dialog people", () => {
  const alice = new Api.User({
    id: bigInt(1),
    accessHash: bigInt(2),
    firstName: "Alice",
  });
  const response = new Api.messages.Dialogs({
    dialogs: [
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
        id: 7,
        peerId: new Api.PeerUser({ userId: bigInt(1) }),
        date: 1234,
        message: "PRIVATE_MESSAGE_SENTINEL",
      }),
    ],
    chats: [],
    users: [alice],
  });
  const result = normalizeDialogs(response);
  assert.equal(result.people.length, 1);
  assert.equal(response.messages.length, 0);
  assert.equal(JSON.stringify(result).includes("PRIVATE_MESSAGE_SENTINEL"), false);
  assert.equal(result.next, null);
});

test("privacy boundary rejects history, message search, download, and update recovery", async () => {
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
    message: "PRIVATE_MESSAGE_SENTINEL",
  };
  repo.savePeople([person]);
  assert.equal(JSON.stringify(repo.storedPeople()).includes("PRIVATE_MESSAGE_SENTINEL"), false);
  assert.equal("accessHash" in (repo.people()[0] ?? {}), false);
  repo.saveSession("SECRET_SESSION");
  assert.equal(repo.session(), "SECRET_SESSION");
  const ciphertext = seal("SECRET_SESSION", key);
  assert.equal(ciphertext.includes("SECRET_SESSION"), false);
  assert.throws(() => unseal(ciphertext, Buffer.alloc(32, 8)));
  repo.clearAll();
  assert.equal(repo.session(), "");
  assert.deepEqual(repo.people(), []);
  repo.close();
});
