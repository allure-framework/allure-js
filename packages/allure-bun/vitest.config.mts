import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    testTimeout: 30000,
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
