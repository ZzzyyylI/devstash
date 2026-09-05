import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit-test config. Scope is deliberately narrow: server actions
 * (`src/actions/**`) and utilities (`src/lib/**`) only — no component or DOM
 * testing, so the environment is plain `node` with no React/jsdom setup.
 *
 * Tests live next to the code they cover as `*.test.ts`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/{actions,lib}/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
