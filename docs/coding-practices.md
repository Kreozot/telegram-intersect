# Coding practices

## Single responsibility

Every function, module, service, hook, and component has one coherent responsibility and one reason to change. Separate transport, validation, orchestration, domain transformations, persistence, and rendering. Keep graph derivation pure; keep Telegram effects in its adapter. Avoid speculative abstractions and arbitrary line-count limits.

## Types and contracts

Use strict TypeScript, noUncheckedIndexedAccess, and exactOptionalPropertyTypes. Define explicit domain types, component props, API payloads, errors, and discriminated unions for workflow states. Avoid any; narrow unknown at external boundaries with runtime validation. Use type-only imports. Do not leak library protocol entities into browser contracts. Prefer readonly collections when mutation is unnecessary.

## JSDoc

All application logic functions, methods, hooks, and components require JSDoc describing why they exist and which feature or caller uses them. Include side effects, failure behavior, and non-obvious parameter/result semantics when relevant. Do not merely restate the name or repeat TypeScript types. Extract substantive callback logic into named, documented functions. Trivial inline predicates need no standalone essay, but must remain covered by the enclosing function's documented behavior.

## Component ownership

One component per file. Keep components atomic by responsibility, not by splitting every HTML element. Place private children under their parent's folder, with their own component and stylesheet files. Promote a component to a shared folder when multiple independent consumers need it. Keep fetching and scan orchestration outside presentational components. Preserve accessible keyboard navigation and provide a list/details alternative to graph-only interaction.

## Styles and graph integration

Use colocated CSS or SCSS, custom class names, and shared theme tokens. Prefer CSS Modules if approved. Do not use authored inline styles, utility-class frameworks, or component style props for ordinary layout. A graph library's required canvas styling API is an adapter concern: centralize it outside JSX and derive colors from theme tokens. Document unavoidable library-generated runtime styling rather than claiming to eliminate it.

## Tests and changes

Test observable behavior: union deduplication, ID safety, graph counts, incomplete scans, pagination, flood waits, recovery, session authorization, and deletion. Use synthetic Telegram adapter fixtures. Integration tests cover contracts and storage; browser tests cover sign-in states, selection, scan progress, themes, and graph/details interaction. Run type checking, Biome, relevant tests, and production build before declaring implementation complete. Record any live Telegram flow that remains unverified.
