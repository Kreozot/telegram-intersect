# Decision 0002: Implementation boundaries and privacy

Date: 2026-09-10. Status: implementation details under the approved stack.

Use Node.js 24, npm with an exact lockfile, the built-in node:sqlite driver, Node's test runner, and TypeScript via tsx for development. This avoids an ORM, external database driver, and separate test framework. Fastify JSON schemas validate request boundaries. Vite runs as development middleware on the application port; production serves its static output. The built-in SQLite API is still evolving, so the runtime major is constrained and storage is encapsulated.

Use one owner access key with expiring in-memory browser sessions. Never log access keys. The local UI can read the generated key from a protected local file through owner action; hosted deployments provide it through environment configuration. Only loopback is enabled unless a public HTTPS origin is explicitly configured.

Application sources live in app/src/{server,web,shared}, keeping Pinokio launcher files outside the application package. The owner explicitly requested this repository as the project destination and requested Pinokio settings within it. Accordingly, distributable launchers are authored here; installed copies belong under PINOKIO_HOME/api/telegram-intersect. The discovered local PINOKIO_HOME is G:/pinokio, used only for checking examples, never embedded in distributable scripts.

## Privacy invariant

No message history requests, message search, media download, message sending, read receipts, or persistence of message content. Keep only person IDs/names/usernames/source flags, server-only access hashes, group IDs/titles, observed membership edges, scan state/timestamps, and encrypted authorization material. Disable Telegram update reception for the analysis client and disable protocol logging.

Telegram's getDialogs response unavoidably includes top-message objects. The owner explicitly approved incidental receipt and immediate discard. Contact discovery avoids getDialogs; dialog discovery strips content in the adapter, keeps only cursor metadata in memory, and never serializes raw responses. The application must not falsely advertise zero message bytes received when dialog discovery is enabled.

The owner approved teleproto after npm reported GramJS as archived. The SDK's update manager is disabled and RPCs are allowlisted. This replaces the original recommendation without changing the rest of the approved stack.

## Pinokio verification checklist

Reference: prototype/system/examples/facepoke/pinokio.js for dynamic menu states; sillytavern/install.js for npm installation; gepeto's critical capture pattern for start URL extraction (the older mochi example uses a different capture index).

- Keep launcher scripts at repository root and the application in app/.
- Use relative paths, npm ci, dynamic port, loopback binding, daemon mode, regex capture group 1, and local.set with input.event[1].
- Provide install/start/update/dependency-reset menus and no redundant stop script.
- Provision Node.js 24 in an isolated runtime/ Conda environment, using the documented shell.run conda activation. Reset only runtime/dependencies/build output, preserving private configuration/data.
- Use no absolute machine-specific paths in launcher files.
- Validate scripts and menu transitions locally; live Pinokio verification requires its control plane to be reachable.
