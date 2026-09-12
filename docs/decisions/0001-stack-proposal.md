# Decision 0001: Initial technology stack

Status: ACCEPTED — owner approved the recommended stack and initial scope on 2026-09-10.
Date: 2026-09-10.

The Pinokio packaging portion of this decision was superseded by Decision 0008 on 2026-09-12.

## Already required by the owner

TypeScript throughout; web UI plus server; free solutions; existing graph library; themed UI kit; custom colocated CSS/SCSS; Biome; English documentation and comments; SRP; detailed types and JSDoc.

## Options and recommendation

| Area | Recommended option | Main benefit | Alternative and tradeoff |
| --- | --- | --- | --- |
| App structure | React + Vite UI, Node.js + Fastify server | Explicit UI/service boundaries; persistent Telegram connection fits a long-running process | Next.js: integrated full-stack framework, but server rendering is of limited value here and persistent scans still require process lifecycle design |
| Telegram | teleproto behind a typed privacy adapter (approved replacement for GramJS) | JavaScript/TypeScript integration without a native TDLib binary | TDLib with Node bindings: official Telegram client engine with local state management, but native packaging and wrapper integration are more involved |
| UI | Mantine + CSS Modules | Styled components, themes, and custom CSS integration | Radix Primitives + custom CSS: greater styling control, but primitives are unstyled and require building the visual kit |
| Graph | Cytoscape.js | Graph interaction, layouts, and analysis in an established library | Sigma.js + Graphology: strong candidate for large WebGL networks, but more integration choices for analysis/layouts |
| Persistence | SQLite | Single-file local/self-hosted storage without a separate database service | PostgreSQL: appropriate for concurrent multi-user/server expansion, but adds database administration |

Recommended first-release tenancy: one owner and one Telegram account per deployment, including protected self-hosted use. A multi-user service changes authentication, isolation, and operations and needs a separate decision.

The owner accepted these recommendations. During installation npm reported GramJS as archived; the owner explicitly approved replacing it with teleproto. The remaining stack is unchanged. Node.js 24, built-in SQLite, Fastify JSON schemas, npm, and Node's test runner implement the supporting infrastructure. Versions are pinned in package.json and package-lock.json.

## Consequences

- Keep Telegram state in a long-running server; serve the built browser UI and API on one port.
- Hide teleproto behind a narrow privacy adapter to contain protocol/version changes.
- Use CSS Modules for authored UI styles; encapsulate graph-library styling separately.
- SQLite requires persistent storage, migration handling, and backups; it does not itself encrypt all application data.
- Benchmark representative synthetic networks before setting graph size limits.

## Primary sources checked

- [Vite guide](https://vite.dev/guide/), [Fastify documentation](https://fastify.dev/docs/latest/), [Next.js documentation](https://nextjs.org/docs)
- [GramJS](https://gram.js.org/), [TDLib](https://core.telegram.org/tdlib)
- [Mantine CSS Modules](https://mantine.dev/styles/css-modules/), [Mantine color schemes](https://mantine.dev/theming/color-schemes/), [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Cytoscape.js](https://js.cytoscape.org/), [Sigma.js](https://www.sigmajs.org/)
- [SQLite use cases](https://sqlite.org/whentouse.html), [Biome configuration](https://biomejs.dev/reference/configuration/)

## Approval record

Approved on 2026-09-10 in the project conversation. The owner additionally required no conversation loading/storage, Pinokio integration, and README launch/debug instructions. The owner then approved teleproto and transient receipt/discard of dialog-list top messages. Historical alternatives above are retained for context. See [teleproto migration documentation](https://docs.teleproto.dev/migrating-from-gramjs).
