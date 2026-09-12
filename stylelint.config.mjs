/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["dist/**", "node_modules/**"],
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    "custom-property-empty-line-before": null,
    "media-feature-range-notation": null,
    "no-descending-specificity": null,
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]*$",
  },
  overrides: [
    {
      files: ["**/*.module.css"],
      rules: {
        "selector-max-compound-selectors": 1,
        "selector-max-type": 0,
      },
    },
  ],
};
