import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import type { Config } from "../src/server/config.js";
import { registerAccess } from "../src/server/security/access.js";

/** Creates synthetic server configuration without reading owner secrets or local data. */
function config(origin: string | null): Config {
  return {
    dataDir: "",
    port: 4310,
    host: origin ? "0.0.0.0" : "127.0.0.1",
    origin,
    accessKey: origin ? "a".repeat(32) : null,
    encryptionKey: Buffer.alloc(32),
    apiId: 0,
    apiHash: "",
    maxSelectedPeople: 50,
  };
}

test("automatically authorizes loopback access while retaining request protections", async () => {
  const app = Fastify();
  registerAccess(app, config(null));
  app.get("/api/private", async () => ({ data: "private" }));

  const access = await app.inject({ url: "/api/access" });
  assert.deepEqual(access.json(), {
    authenticated: true,
    accessMode: "local",
    maxSelectedPeople: 50,
  });
  assert.equal((await app.inject({ url: "/api/private" })).statusCode, 200);
  assert.equal(
    (
      await app.inject({
        url: "/api/private",
        headers: { host: "evil.example" },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: "/api/access",
        headers: { "x-intersect-request": "1", origin: "https://evil.example" },
      })
    ).statusCode,
    403,
  );
  await app.close();
});

test("requires a key for hosted access and expires its browser session on lock", async () => {
  const app = Fastify();
  const hosted = config("https://intersect.example");
  const host = { host: "intersect.example" };
  registerAccess(app, hosted);
  app.get("/api/private", async () => ({ data: "private" }));

  assert.equal((await app.inject({ url: "/api/private", headers: host })).statusCode, 401);
  const login = await app.inject({
    method: "POST",
    url: "/api/access",
    headers: { ...host, "x-intersect-request": "1" },
    payload: { key: hosted.accessKey },
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().accessMode, "key");
  const cookie = String(login.headers["set-cookie"]).split(";")[0] ?? "";
  assert.match(cookie, /^intersect_session=/);
  assert.equal(
    (await app.inject({ url: "/api/private", headers: { ...host, cookie } })).statusCode,
    200,
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: "/api/access",
        headers: { ...host, cookie, "x-intersect-request": "1" },
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (await app.inject({ url: "/api/private", headers: { ...host, cookie } })).statusCode,
    401,
  );
  await app.close();
});
