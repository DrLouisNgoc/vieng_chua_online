// `npm run lint` (repo root, also a CI job). typescript-eslint parses with
// the root's own typescript@6.0 (it supports < 6.1); app/ and server/ still
// build and typecheck with TypeScript 7. Rules are syntax-level only (no
// type information), which is what that split allows.
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
  ...tseslint.configs.recommended,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
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
);
