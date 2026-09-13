import type { FastifyInstance } from "fastify";
import type { PersonSource } from "../../shared/contracts.js";
import { queueCatalogCounts, refreshCatalogAndQueueCounts } from "../catalog-refresh.js";
import type { Config } from "../config.js";
import { RequestError } from "../request-error.js";
import type { ScanService } from "../scans/scan-service.js";
import type { Repository } from "../storage/repository.js";
import type { AvatarService } from "../telegram/avatar-service.js";
import type { MetadataService } from "../telegram/metadata-service.js";
import type { TelegramService } from "../telegram/telegram-service.js";
import type { WorkspaceEvents } from "../workspace-events.js";

/** Registers protected metadata routes with strict JSON schemas and no raw provider serialization. */
export function registerRoutes(
  app: FastifyInstance,
  repo: Repository,
  telegram: TelegramService,
  scans: ScanService,
  metadata: MetadataService,
  config: Config,
  avatars?: AvatarService,
  events?: WorkspaceEvents,
): void {
  app.get("/api/telegram", async () => telegram.state());
  app.post<{ Body: { mode: "phone" | "qr" } }>(
    "/api/telegram/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["mode"],
          additionalProperties: false,
          properties: { mode: { enum: ["phone", "qr"] } },
        },
      },
    },
    async (request) => {
      telegram.start(request.body.mode);
      return telegram.state();
    },
  );
  app.post<{ Body: { value: string } }>(
    "/api/telegram/answer",
    {
      schema: {
        body: {
          type: "object",
          required: ["value"],
          additionalProperties: false,
          properties: {
            value: { type: "string", minLength: 1, maxLength: 512 },
          },
        },
      },
    },
    async (request) => {
      telegram.answer(request.body.value);
      request.body.value = "";
      return telegram.state();
    },
  );
  app.post("/api/telegram/cancel", async () => {
    await telegram.cancelLogin();
    return telegram.state();
  });
  app.delete("/api/telegram", async () => {
    metadata.assertIdle();
    await scans.cancel();
    await telegram.logout();
    return telegram.state();
  });
  app.get("/api/snapshot", async () => ({
    people: repo.people(),
    scan: repo.scan(),
    avatarLoading: avatars?.isRunning() ?? false,
  }));
  app.get("/api/snapshot/completed", async () => ({
    people: repo.people(),
    scan: repo.completedScan(),
    avatarLoading: avatars?.isRunning() ?? false,
  }));
  app.get("/api/events", async (request, reply) => {
    if (!events) return reply.code(503).send({ error: "Workspace events are unavailable." });
    reply.hijack();
    reply.raw.writeHead(200, {
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write("retry: 2000\n\n");
    const header = request.headers["last-event-id"];
    const afterId = typeof header === "string" ? Number.parseInt(header, 10) || 0 : 0;
    const unsubscribe = events.subscribe(afterId, ({ id, event }) => {
      reply.raw.write(`id: ${id}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(": keepalive\n\n"), 20_000);
    reply.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
  app.get<{ Params: { personId: string } }>(
    "/api/avatars/:personId",
    {
      schema: {
        params: {
          type: "object",
          required: ["personId"],
          additionalProperties: false,
          properties: {
            personId: { type: "string", pattern: "^(user|chat|channel):[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      const avatar = repo.avatar(request.params.personId);
      if (!avatar) return reply.code(404).send({ error: "Avatar is not cached." });
      return reply
        .header("Cache-Control", "private, max-age=31536000, immutable")
        .type(avatar.contentType)
        .send(avatar.bytes);
    },
  );
  app.post<{ Body: { source: PersonSource } }>(
    "/api/people",
    {
      schema: {
        body: {
          type: "object",
          required: ["source"],
          additionalProperties: false,
          properties: { source: { enum: ["contacts", "dialogs"] } },
        },
      },
    },
    async (request) => {
      await refreshCatalogAndQueueCounts(request.body.source, repo, metadata, scans);
      return { ok: true };
    },
  );
  app.post<{ Body: { ids: string[] } }>(
    "/api/scans",
    {
      schema: {
        body: {
          type: "object",
          required: ["ids"],
          additionalProperties: false,
          properties: {
            ids: {
              type: "array",
              minItems: 1,
              maxItems: 10000,
              items: { type: "string", pattern: "^user:[0-9]+$" },
            },
          },
        },
      },
    },
    async (request) => {
      if (telegram.state().stage !== "authorized")
        throw new RequestError("Sign in to Telegram first.");
      metadata.assertIdle();
      if (new Set(request.body.ids).size > config.maxSelectedPeople)
        throw new RequestError(
          `Select no more than ${config.maxSelectedPeople} people at the same time.`,
        );
      return scans.enqueue(request.body.ids);
    },
  );
  app.post("/api/scans/catalog", async () => {
    if (telegram.state().stage !== "authorized")
      throw new RequestError("Sign in to Telegram first.");
    metadata.assertIdle();
    return { queued: queueCatalogCounts(repo, scans) !== null };
  });
  app.post("/api/scans/cancel", async () => {
    await scans.cancel();
    return { scan: repo.scan() };
  });
  app.post("/api/scans/resume", async () => {
    metadata.assertIdle();
    if (telegram.state().stage !== "authorized")
      throw new RequestError("Sign in to Telegram first.");
    return scans.resume();
  });
  app.delete("/api/analysis", async () => {
    metadata.assertIdle();
    await scans.cancel();
    repo.clearAnalysis();
    return { people: [], scan: null };
  });
}
