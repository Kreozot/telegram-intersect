# Code style

This file contains stylistic conventions. Design responsibilities and verification belong in coding-practices.md.

- Two-space indentation, LF line endings, UTF-8, final newline, and a 100-character formatting width.
- Double quotes in TypeScript and JSX; semicolons; trailing commas where supported; parentheses around arrow parameters.
- PascalCase component/type names; camelCase functions and variables; descriptive constants; no cryptic abbreviations.
- Component files use PascalCase.tsx. Hooks use useFeatureName.ts. Other modules use descriptive kebab-case.ts names.
- Styles sit beside their owner, for example PersonCard.tsx and PersonCard.module.css. CSS Modules are approved.
- Prefer named exports except where a framework requires defaults.
- Use descriptive custom CSS class names and semantic theme variables.
- Use camelCase names for CSS Module classes.
- Separate adjacent CSS rule blocks with an empty line.
- Avoid relying on inherited styles or element/tag selectors when the element can have a dedicated
  class. Prefer a directly assigned class over styling an element through an ancestor selector.
- Write comments and JSDoc in English.

biome.json records supported formatting and the recommended lint preset for the pinned Biome version.
Stylelint applies its standard CSS rules from `app/stylelint.config.mjs`; `npm run lint:css`
checks authored styles, and the main check and format commands include Stylelint. Generated output,
private data, dependencies, and the Pinokio runtime are excluded. Naming, JSDoc completeness, SRP,
and component ownership also require review; automated linters do not enforce all of them.
App-authored styles use CSS Modules; third-party component/canvas runtime styling is encapsulated.
