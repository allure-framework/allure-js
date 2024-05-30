import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/spec/**/*.ts"],
    fileParallelism: false,
    testTimeout: 5000,
    reporters: ["default"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});
