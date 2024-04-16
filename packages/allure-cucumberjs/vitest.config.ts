import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: Infinity,
    // testTimeout: 25000,
    reporters: [
      "default",
    ],
  },
});
