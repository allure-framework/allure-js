import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    testTimeout: 20000,
    setupFiles: ["allure-vitest/setup"],
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
});
