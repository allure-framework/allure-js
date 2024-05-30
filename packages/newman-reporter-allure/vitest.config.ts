import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 25000,
    reporters: ["default"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});
