import { versions } from "node:process";

import { defineConfig } from "vite-plus";

const supportsNodeTestSuite = Number(versions.node.split(".")[0]) >= 26;

export default defineConfig({
  test: {
    ...(!supportsNodeTestSuite && { include: [], passWithNoTests: true }),
    globals: true,
    setupFiles: ["./vitest-setup.ts"],
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
  },
});
