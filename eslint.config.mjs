// `npm run lint` (repo root; required in CI, run on commit by lefthook).
// Decision 0017. Layers, in order — later ones win:
//   1. Airbnb (eslint-config-airbnb-extended: base + TypeScript, incl. import-x)
//   2. typescript-eslint strictTypeChecked + stylisticTypeChecked (type-aware,
//      through each folder's tsconfig; parsed by the root's typescript@6.0)
//   3. unicorn, regexp, security, sonarjs, eslint-comments
//   4. import order (simple-import-sort) and import-x correctness
//   5. project rules (docs/conventions.md) and the documented Airbnb deviations
//   6. eslint-plugin-oxlint: rules oxlint already checks are turned off here
//   7. eslint-config-prettier: formatting is Prettier's job, never ESLint's
import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { configs as airbnb, plugins as airbnbPlugins, rules as airbnbRules } from "eslint-config-airbnb-extended";
import prettier from "eslint-config-prettier/flat";
import oxlint from "eslint-plugin-oxlint";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const TS_FILES = ["**/*.ts"];

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/dist-*/**", "app/public/**", "docs/**"],
  },

  // 1. Airbnb
  js.configs.recommended,
  airbnbPlugins.stylistic,
  airbnbPlugins.importX,
  airbnbPlugins.node,
  airbnbPlugins.typescriptEslint,
  ...airbnb.base.recommended,
  ...airbnb.base.typescript,
  airbnbRules.base.importsStrict,
  airbnbRules.typescript.typescriptEslintStrict,

  // 2. typescript-eslint, strictest presets, type-aware
  { files: TS_FILES, extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked] },
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.mjs", "scripts/*.mjs", "shared/*.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },

  // 3. More bug-finding and modern-JS rules
  unicorn.configs.recommended,
  regexp.configs["flat/recommended"],
  security.configs.recommended,
  // No warnings anywhere: every security rule is an error.
  { rules: Object.fromEntries(Object.keys(security.configs.recommended.rules).map((rule) => [rule, "error"])) },
  sonarjs.configs.recommended,
  comments.recommended,

  // 4 + 5. Imports and project rules
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // Imports: sorted automatically; import-x checks they resolve and are declared.
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "import-x/order": "off",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
      // Deviation: the project uses named exports only (docs/conventions.md).
      "import-x/prefer-default-export": "off",
      "import-x/no-default-export": "error",

      // Correctness
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        { allowString: false, allowNumber: false, allowNullableObject: true },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],

      // Size and complexity (docs/conventions.md: files < 400 lines, functions < ~60)
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "@typescript-eslint/max-params": ["error", { max: 4 }],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }],

      // Every disable needs a reason after "--".
      "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",

      // Documented deviations from Airbnb/unicorn (docs/conventions.md "Lint"):
      // for…of is fine on an ES2023 target (Airbnb bans it for ES5 regenerator reasons).
      "no-restricted-syntax": [
        "error",
        { selector: "ForInStatement", message: "Use for…of over Object.keys/entries instead." },
        { selector: "LabeledStatement", message: "Labels are a form of GOTO." },
        { selector: "WithStatement", message: "`with` is disallowed." },
      ],
      // Leading _ marks an intentionally unused name.
      "no-underscore-dangle": ["error", { allow: [], allowAfterThis: false, allowFunctionParams: true }],
      // The JSON wire protocol uses null on purpose.
      "unicorn/no-null": "off",
      // Would rename thousands of identifiers, including Vietnamese domain words.
      "unicorn/prevent-abbreviations": "off",
      "unicorn/name-replacements": "off",
      // One file-name rule for the whole repo.
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      // Floods false positives on every obj[key].
      "security/detect-object-injection": "off",
      // Every fs path here is built by our own code (data/, temp dirs), never from a request.
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    // Server runs on Node's ESM resolver (NodeNext): relative imports need ".js".
    files: ["server/src/**/*.ts", "scripts/**/*.mjs"],
    rules: { "import-x/extensions": ["error", "ignorePackages", { js: "always", ts: "never" }] },
  },
  {
    // App is bundled by Vite: relative imports have no extension.
    files: ["app/src/**/*.ts"],
    rules: { "import-x/extensions": ["error", "never", { css: "always", json: "always" }] },
  },
  {
    // Config files must export default; plain JS has no types to check.
    files: ["**/*.mjs", "**/*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "import-x/no-default-export": "off" },
  },
  { files: ["app/src/**/*.ts"], languageOptions: { globals: globals.browser } },
  { files: ["server/src/**/*.ts", "scripts/**/*.mjs", "*.mjs"], languageOptions: { globals: globals.node } },
  {
    // Command-line scripts: they report through stdout, exit with a status
    // code for CI, and run git from PATH by design.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off", "unicorn/no-process-exit": "off", "sonarjs/no-os-command-from-path": "off" },
  },
  {
    // A test file is one describe() callback holding many it() cases.
    files: ["**/*.test.ts"],
    rules: { "max-lines-per-function": "off", "max-lines": "off", "sonarjs/no-duplicate-string": "off" },
  },

  // 6 + 7. Last: hand rules oxlint covers to oxlint, formatting to Prettier.
  ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
  prettier,
);
