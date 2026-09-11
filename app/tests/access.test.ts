import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import type { Config } from "../src/server/config.js";
import { registerAccess } from "../src/server/security/access.js";

test("protects metadata, rejects cross-origin mutations and DNS rebinding, and expires browser access on lock", async () => {
  const app = Fastify();
  const config: Config = {
    dataDir: "",
    port: 4310,
    host: "127.0.0.1",
    origin: null,
    accessKey: "a".repeat(32),
    encryptionKey: Buffer.alloc(32),
    apiId: 0,
    apiHash: "",
    maxSelectedPeople: 50,
  };
  registerAccess(app, config);
  app.get("/api/private", async () => ({ data: "private" }));
  assert.equal((await app.inject({ url: "/api/private" })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        url: "/api/private",
        headers: { host: "evil.example" },
      })
    ).statusCode,
    403,
  );
  const login = await app.inject({
    method: "POST",
    url: "/api/access",
    headers: { "x-intersect-request": "1" },
    payload: { key: config.accessKey },
  });
  assert.equal(login.statusCode, 200);
  const cookie = String(login.headers["set-cookie"]).split(";")[0] ?? "";
  assert.match(cookie, /^intersect_session=/);
  assert.equal((await app.inject({ url: "/api/private", headers: { cookie } })).statusCode, 200);
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: "/api/access",
        headers: {
          cookie,
          "x-intersect-request": "1",
          origin: "https://evil.example",
        },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: "/api/access",
        headers: { cookie, "x-intersect-request": "1" },
      })
    ).statusCode,
    200,
  );
  assert.equal((await app.inject({ url: "/api/private", headers: { cookie } })).statusCode, 401);
  await app.close();
});
