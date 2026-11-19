import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    setupFiles: ["allure-vitest/setup"],
    testTimeout: 30000,
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
