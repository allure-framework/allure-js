import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    // testTimeout: 25000,
    testTimeout: Infinity,
    setupFiles: ["./vitest-setup.ts"],
    reporters: ["verbose", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
