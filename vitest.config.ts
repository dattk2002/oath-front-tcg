import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "tools/load/tests/**/*.test.ts",
      "tools/assets/tests/**/*.test.ts",
      "tools/simulation/tests/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
      "apps/api/tests/**/*.test.{ts,mjs}",
      "apps/web/tests/**/*.test.ts",
      "apps/web/src/content/**/*.test.ts",
    ],
  },
});
