import type { FastifyInstance } from "fastify";
import type { PersonSource } from "../../shared/contracts.js";
import type { Config } from "../config.js";
import { RequestError } from "../request-error.js";
import type { ScanService } from "../scans/scan-service.js";
import type { Repository } from "../storage/repository.js";
import type { MetadataService } from "../telegram/metadata-service.js";
import type { TelegramService } from "../telegram/telegram-service.js";

/** Registers protected metadata routes with strict JSON schemas and no raw provider serialization. */
export function registerRoutes(
  app: FastifyInstance,
  repo: Repository,
  telegram: TelegramService,
  scans: ScanService,
  metadata: MetadataService,
  config: Config,
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
  }));
  app.get("/api/snapshot/completed", async () => ({
    people: repo.people(),
    scan: repo.completedScan(),
  }));
  app.get<{ Params: { personId: string } }>(
    "/api/avatars/:personId",
    {
      schema: {
        params: {
          type: "object",
          required: ["personId"],
          additionalProperties: false,
          properties: { personId: { type: "string", pattern: "^user:[0-9]+$" } },
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
      if (repo.scan()?.running)
        throw new RequestError("Wait for the current scan before refreshing people.");
      await metadata.loadPeople(request.body.source);
      return { people: repo.people() };
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
