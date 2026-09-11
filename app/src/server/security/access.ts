import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Config } from "../config.js";

/** Hashes access inputs to fixed-size buffers so comparison does not reveal key length. */
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Extracts the opaque browser cookie without accepting tokens in URLs. */
function token(request: FastifyRequest): string {
  return (
    request.headers.cookie
      ?.split(";")
      .find((part) => part.trim().startsWith("intersect_session="))
      ?.trim()
      .slice(18) ?? ""
  );
}

/** Protects all API data and mutations with owner access, host validation, and same-origin requests. */
export function registerAccess(app: FastifyInstance, config: Config): void {
  const sessions = new Map<string, number>();
  let failedAttempts = 0;
  let retryAfter = 0;
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host ?? "";
    const allowedHost = config.origin ? new URL(config.origin).host : null;
    if (
      allowedHost ? host !== allowedHost : !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)
    ) {
      return reply.code(403).send({ error: "Unrecognized host." });
    }
    const origin = config.origin ?? `http://${host}`;
    if (request.headers.origin && request.headers.origin !== origin)
      return reply.code(403).send({ error: "Unrecognized origin." });
    if (!request.url.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD"].includes(request.method) && request.headers["x-intersect-request"] !== "1")
      return reply.code(403).send({ error: "Missing request protection." });
    if (request.url === "/api/access" && request.method === "POST") return;
    if (request.url === "/api/health" || request.url === "/api/access") return;
    const expires = sessions.get(token(request)) ?? 0;
    if (expires < Date.now())
      return reply.code(401).send({ error: "Unlock this workspace first." });
  });
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/access", async (request) => ({
    authenticated: (sessions.get(token(request)) ?? 0) > Date.now(),
  }));
  app.post<{ Body: { key: string } }>(
    "/api/access",
    {
      schema: {
        body: {
          type: "object",
          required: ["key"],
          additionalProperties: false,
          properties: { key: { type: "string", maxLength: 512 } },
        },
      },
    },
    async (request, reply) => {
      if (Date.now() < retryAfter)
        return reply.code(429).send({ error: "Too many attempts. Try again in one minute." });
      if (!timingSafeEqual(digest(request.body.key), digest(config.accessKey))) {
        failedAttempts += 1;
        if (failedAttempts >= 5) {
          retryAfter = Date.now() + 60_000;
          failedAttempts = 0;
        }
        return reply.code(401).send({ error: "Access key is incorrect." });
      }
      failedAttempts = 0;
      for (const [id, expires] of sessions) if (expires < Date.now()) sessions.delete(id);
      if (sessions.size >= 20) sessions.clear();
      const id = randomBytes(32).toString("hex");
      sessions.set(id, Date.now() + 12 * 60 * 60_000);
      reply.header(
        "Set-Cookie",
        `intersect_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${config.origin ? "; Secure" : ""}`,
      );
      return { authenticated: true };
    },
  );
  app.delete("/api/access", async (request, reply) => {
    sessions.delete(token(request));
    reply.header("Set-Cookie", "intersect_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    return { authenticated: false };
  });
}
