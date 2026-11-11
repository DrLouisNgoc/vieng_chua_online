// `npm run lint` (repo root, a required CI job), together with oxlint
// (.oxlintrc.json). Strictest typescript-eslint presets, type-aware: rules
// read each file's types through its own tsconfig (app/, server/), parsed
// by the root's typescript@6.0 (typescript-eslint supports < 6.1; app/ and
// server/ themselves build with TypeScript 7, which oxlint's type-aware
// pass uses).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Edited by the open branch ngoc/chanh-dien-kinh-nikaya: linted (and split)
// once it merges, so that branch does not hit conflicts or a red lint job.
const WAITING_FOR_OPEN_BRANCH = [
  "app/src/main.ts",
  "app/src/scene.ts",
  "app/src/temple-grounds.ts",
  "app/src/boards-panel.ts",
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-*/**",
      "app/public/**",
      "docs/**",
      ...WAITING_FOR_OPEN_BRANCH,
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.mjs", "scripts/*.mjs", "shared/*.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Correctness
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-implicit-coercion": "error",
      "no-param-reassign": "error",
      "no-return-assign": "error",
      "no-self-compare": "error",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "no-promise-executor-return": "error",
      "no-constructor-return": "error",
      "no-template-curly-in-string": "error",
      "require-atomic-updates": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        { allowString: false, allowNumber: false, allowNullableObject: true },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      // Readability (docs/conventions.md: files < 400 lines, functions < ~60)
      curly: ["error", "multi-line"],
      "no-nested-ternary": "error",
      "no-else-return": ["error", { allowElseIf: false }],
      "object-shorthand": "error",
      "prefer-template": "error",
      "no-var": "error",
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],
    },
  },
  {
    // Plain JS files: no types to check against.
    files: ["**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["app/src/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["server/src/**/*.ts", "scripts/**/*.mjs", "*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    // Command-line scripts report through stdout on purpose.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
  {
    // A test file is one describe() callback holding many it() cases.
    files: ["**/*.test.ts"],
    rules: { "max-lines-per-function": "off", "max-lines": "off" },
  },
);
