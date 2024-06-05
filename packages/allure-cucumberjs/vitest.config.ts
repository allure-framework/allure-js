import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    testTimeout: 5000,
    reporters: [
      "default",
    ],
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json"
    }
  },
});
