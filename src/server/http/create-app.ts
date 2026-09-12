import Fastify from "fastify";
import type { Config } from "../config.js";
import { RequestError } from "../request-error.js";
import type { ScanService } from "../scans/scan-service.js";
import { registerAccess } from "../security/access.js";
import type { Repository } from "../storage/repository.js";
import type { MetadataService } from "../telegram/metadata-service.js";
import type { TelegramService } from "../telegram/telegram-service.js";
import { registerRoutes } from "./routes.js";

/** Composes the HTTP boundary without opening sockets, allowing isolated authorization tests. */
export function createApp(
  config: Config,
  repo: Repository,
  telegram: TelegramService,
  scans: ScanService,
  metadata: MetadataService,
) {
  const app = Fastify({
    logger: false,
    bodyLimit: 128 * 1024,
    requestTimeout: 120_000,
  });
  registerAccess(app, config);
  registerRoutes(app, repo, telegram, scans, metadata, config);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RequestError) return reply.code(409).send({ error: error.message });
    if (error instanceof Error && "validation" in error)
      return reply.code(400).send({ error: "Invalid request. Check the submitted fields." });
    return reply.code(400).send({
      error: "The operation could not be completed. Check the current state and try again.",
    });
  });
  return app;
}
