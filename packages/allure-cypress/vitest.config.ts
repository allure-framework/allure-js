import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    testTimeout: 45000,
    setupFiles: ["./vitest-setup.ts"],
    reporters: ["default", ["allure-vitest/reporter", {
      resultsDir: "./out/allure-results",
      links: {
        issue: {
          urlTemplate: "https://github.com/allure-framework/allure-js/issues/%s",
          nameTemplate: "ISSUE-%s",
        },
      },
    }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
