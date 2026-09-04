import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prettier",
    // Generated output. ESLint 9 does not read .gitignore, so directories that
    // git already ignores still have to be named here.
    "coverage/**",
    "playwright-report/**",
    "blob-report/**",
    "test-results/**",
  ]),
  {
    // Playwright names its fixture callback `use`, which the React rule reads as
    // a hook call, and it requires an object pattern as the first argument even
    // when a fixture depends on nothing. There is no React in this directory.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off", "no-empty-pattern": "off" },
  },
]);

export default eslintConfig;
