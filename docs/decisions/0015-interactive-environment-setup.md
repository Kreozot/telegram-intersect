# Decision 0015: Interactive environment setup

Date: 2026-09-13. Status: ACCEPTED — requested by the owner.

## Decision

Provide `npm run init` as a TypeScript Inquirer flow for first-time local configuration. The command
explains, in plain language, how to obtain user-client credentials from Telegram and links to both
the application page and Telegram's official guide.

The initializer copies `.env.example` only when `.env` does not exist. It reports credentials that
are already configured, asks only for missing values, preserves unrelated settings, masks the API
hash input, and never prints credentials. If both values exist, it makes no changes.

Inquirer is pinned as a development dependency because the command is a repository setup tool run
after `npm ci`; it is not part of the production server bundle or browser application.

## Consequences

- Local and Docker users have one guided credential setup path.
- Environment-file transformations remain separate from prompting so they can be tested without
  real credentials or an interactive terminal.
- Operators can still edit `.env` manually for hosted and advanced configuration.
