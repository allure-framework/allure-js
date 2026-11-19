import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    setupFiles: ["./vitest-setup.ts"],
    testTimeout: 25000,
    reporters: [
      "default",
      [
        "allure-vitest/reporter",
        {
          resultsDir: "./out/allure-results",
        },
      ],
    ],
  },
});
