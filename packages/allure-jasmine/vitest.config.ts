import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    // testTimeout: 25000,
    testTimeout: Infinity,
    reporters: [
      "default",
    ],
  },
});
