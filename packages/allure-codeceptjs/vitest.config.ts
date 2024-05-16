import { env } from "node:process";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: env.TEST_ENV === "local" ? Infinity : 25000,
    reporters: ["default"],
  },
});
