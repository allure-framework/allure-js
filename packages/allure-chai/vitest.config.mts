import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    fileParallelism: false,
    testTimeout: 25000,
    setupFiles: ["./vitest-setup.ts"],
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
