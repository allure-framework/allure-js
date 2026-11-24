import { platform } from "node:process";

import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Limit how many browser sessions the suite starts at once on Windows.
    ...(platform === "win32" && { maxWorkers: 1 }),
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
