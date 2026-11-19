import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
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
