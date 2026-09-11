# Agent instructions

## Required reading

Read README.md, docs/requirements.md, docs/development-plan.md, docs/architecture.md, docs/coding-practices.md, docs/code-style.md, and relevant records in docs/decisions before changing the project.

## Approval and decision tracking

- Key technology choices require owner approval before application implementation or dependency installation. Present alternatives with concise tradeoffs.
- The initial stack and single-owner scope were approved on 2026-09-10. Implementation and repository-local Pinokio launchers are authorized.
- Record approved architectural decisions and their consequences in docs/decisions; update architecture and the development plan as work proceeds.
- Do not silently expand the product scope or substitute a key dependency.

## Implementation rules

- Write application code in strict TypeScript with detailed domain and boundary types.
- Apply the single responsibility principle to functions, modules, hooks, services, and components.
- Document all application logic with English JSDoc explaining purpose, usage context, and relevant behavior. Document components and hooks as well.
- Keep components atomic and in separate files. Nest private components near their JSX parent; place genuinely shared components at the nearest shared level.
- Keep custom styles in colocated CSS or SCSS files, using custom classes. Do not use utility-class frameworks or authored inline styles as the default styling method.
- Keep architecture, coding practices, and purely stylistic rules in their separate documents.
- Use Biome for supported formatting and linting. Biome does not replace type checking, architecture review, or JSDoc review.
- Use English for documentation, comments, README, commits, and pull requests.

## Data and verification

- Never commit or log Telegram sessions, login codes, passwords, API hashes, or real contact datasets.
- Never request message history, download media, persist message content, or expose raw Telegram responses. The owner approved incidental top-message receipt for dialog discovery only; discard those fields immediately and never pass them to the browser or database.
- The owner approved teleproto in place of archived GramJS. Keep its privacy adapter and pinned SDK integration covered by tests when upgrading.
- Keep Telegram credentials and sessions server-side. Never expose a shared account through an unauthenticated remote endpoint.
- Honor Telegram rate-limit waits; preserve partial results and make missing data explicit.
- Use synthetic fixtures for automated tests. Live account checks require the owner's interactive login.
- Test graph correctness, pagination, scan recovery, authentication boundaries, and isolation. Report actual validation and unverified paths without claiming success prematurely.
