# Code style

This file contains stylistic conventions. Design responsibilities and verification belong in coding-practices.md.

- Two-space indentation, LF line endings, UTF-8, final newline, and a 100-character formatting width.
- Double quotes in TypeScript and JSX; semicolons; trailing commas where supported; parentheses around arrow parameters.
- PascalCase component/type names; camelCase functions and variables; descriptive constants; no cryptic abbreviations.
- Component files use PascalCase.tsx. Hooks use useFeatureName.ts. Other modules use descriptive kebab-case.ts names.
- Styles sit beside their owner, for example PersonCard.tsx and PersonCard.module.css. CSS Modules are approved.
- Prefer named exports except where a framework requires defaults.
- Use descriptive custom CSS class names and semantic theme variables.
- Write comments and JSDoc in English.

biome.json records supported formatting and the recommended lint preset for the pinned Biome version. Generated output, private data, dependencies, and the Pinokio runtime are excluded. Naming, JSDoc completeness, SRP, and component ownership also require review; Biome does not enforce all of them. App-authored styles use CSS Modules; third-party component/canvas runtime styling is encapsulated.
