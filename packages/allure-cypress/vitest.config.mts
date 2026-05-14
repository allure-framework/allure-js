import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    // Inline Cypress runs can be slow to boot on Windows CI, so keep some extra headroom.
    testTimeout: 90000,
    hookTimeout: 90000,
    setupFiles: ["./vitest-setup.ts"],
    reporters: [
      "default",
      [
        "allure-vitest/reporter",
        {
          resultsDir: "./out/allure-results",
          links: {
            issue: {
              urlTemplate: "https://github.com/allure-framework/allure-js/issues/%s",
              nameTemplate: "ISSUE-%s",
            },
          },
        },
      ],
    ],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
