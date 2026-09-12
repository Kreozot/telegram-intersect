import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? "./" : "/",
  build: { outDir: "dist/web", emptyOutDir: true },
  server: { host: "127.0.0.1" },
}));
