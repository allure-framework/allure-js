import { env } from "node:process";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    // testTimeout: 5000,
    testTimeout: Infinity,
    reporters: ["default"],
  },
});
