import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./vitest-setup.ts"],
    reporters: ["default", ["allure-vitest/reporter", { resultsDir: "./out/allure-results" }]],
  },
});
