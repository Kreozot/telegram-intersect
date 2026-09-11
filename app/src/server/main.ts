import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createApp } from "./http/create-app.js";
import { ScanService } from "./scans/scan-service.js";
import { Repository } from "./storage/repository.js";
import { MetadataService } from "./telegram/metadata-service.js";
import { TelegramService } from "./telegram/telegram-service.js";

/** Boots a single-port server with Vite middleware in development and static assets in production. */
async function main(): Promise<void> {
  const config = loadConfig();
  const repo = new Repository(resolve(config.dataDir, "intersect.sqlite"), config.encryptionKey);
  const telegram = new TelegramService(config, repo);
  const metadata = new MetadataService(repo, () => telegram.requireClient());
  const scans = new ScanService(repo, metadata);
  const app = createApp(config, repo, telegram, scans, metadata);
  if (process.argv.includes("--dev")) {
    const { createServer } = await import("vite");
    const { default: middie } = await import("@fastify/middie");
    await app.register(middie);
    const vite = await createServer({
      server: { middlewareMode: true, ws: { server: app.server } },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.get("/", async (request, reply) => {
      const html = await vite.transformIndexHtml(
        request.url,
        await readFile(resolve("index.html"), "utf8"),
      );
      return reply.type("text/html").send(html);
    });
    app.addHook("onClose", async () => {
      await vite.close();
    });
  } else {
    const { default: staticPlugin } = await import("@fastify/static");
    await app.register(staticPlugin, {
      root: resolve("dist/web"),
      prefix: "/",
    });
    app.addHook("onSend", async (request, reply, payload) => {
      if (!request.url.startsWith("/api/"))
        reply.header(
          "Content-Security-Policy",
          `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors ${config.origin ? "'self'" : "'self' http://127.0.0.1:* http://localhost:*"}; base-uri 'self'; form-action 'self'`,
        );
      return payload;
    });
  }
  app.addHook("onClose", async () => {
    await scans.cancel();
    await telegram.close();
    repo.close();
  });
  await app.listen({ host: config.host, port: config.port });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  console.info(`Intersect ready at http://127.0.0.1:${port}`);
  console.info(
    "Workspace key: read data/access-key locally, or use your configured APP_ACCESS_KEY.",
  );
  void telegram.restore();
  /** Closes scans and network connections before releasing persistence on termination. */
  async function shutdown(): Promise<void> {
    await app.close();
  }
  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
}
main().catch(() => {
  console.error("Startup failed. Check port, environment settings, and data directory access.");
  process.exitCode = 1;
});
