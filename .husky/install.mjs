/**
 * Installs repository Git hooks for development checkouts while keeping production installs free
 * from development-only Husky requirements.
 */
async function installGitHooks() {
  if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
    return;
  }

  const { default: husky } = await import("husky");
  const message = husky();

  if (message) {
    console.warn(message);
  }
}

await installGitHooks();
