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
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".superpowers/**",
    ".worktrees/**",
    // Git disi arastirma/import ciktilari; kaynak kod degil (guvenlik denetimi O5#6, 2026-09-26).
    "tmp/**",
    "output/**",
  ]),
]);

export default eslintConfig;
