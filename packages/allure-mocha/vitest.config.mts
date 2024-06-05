import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    testTimeout: 25000,
    reporters: ["default"],
    globalSetup: ["./test/setup.ts"],
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
});
