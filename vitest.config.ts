import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "packages/*/tests/**/*.test.ts",
      "apps/api/tests/**/*.test.{ts,mjs}",
      "apps/web/tests/**/*.test.ts",
    ],
  },
});
