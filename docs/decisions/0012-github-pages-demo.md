# Decision 0012: Static demo on GitHub Pages

Status: ACCEPTED — requested by the owner on 2026-09-13.
Date: 2026-09-13.

## Decision

Publish a demo-only browser build to GitHub Pages after every push to `main`. The demo build opens
directly with synthetic data, uses relative asset paths, performs no application API requests, and
does not offer a route into Telegram login or the private workspace.

Use GitHub Actions to build the pinned dependency tree with Node.js 24 and deploy only `dist/web`.
Do not upload the server build, configuration, database, Telegram credentials, or session material.

## Consequences

- The public site demonstrates selection, both map modes, graph interaction, and themes without a
  server or Telegram account.
- GitHub Pages cannot host the full application. Real Telegram access continues to require the
  protected long-running server documented elsewhere.
- Relative asset paths keep the artifact valid under the repository subpath and after a repository
  rename or custom-domain change.
- Repository administrators must select **GitHub Actions** as the Pages publishing source once; later
  pushes to `main` deploy automatically.
