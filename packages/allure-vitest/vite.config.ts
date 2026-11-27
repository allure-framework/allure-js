import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Limit how many browser sessions the suite starts at once on CI to eliminate browser startup failures
    ...(process.env.CI && { maxWorkers: 1 }),
    dir: "./test/spec",
    testTimeout: 60000,
    setupFiles: ["allure-vitest/setup"],
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
