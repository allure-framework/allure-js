import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "test:run": {
        command: [
          "yarn run test:serial",
          "yarn run test:parallel",
          "yarn run test:runner",
          "yarn run test:runner-parallel",
        ],
        cache: false,
      },
    },
  },
  test: {
    dir: "./test/spec",
    fileParallelism: false,
    testTimeout: 25000,
    hookTimeout: 25000,
    globalSetup: ["./test/setup.ts"],
    setupFiles: ["./vitest-setup.ts"],
    reporters: [
      "default",
      [
        "allure-vitest/reporter",
        {
          resultsDir: "./out/allure-results",
          links: { issue: { urlTemplate: "https://github.com/allure-framework/allure-js/issues/%s" } },
        },
      ],
    ],
    typecheck: {
      enabled: true,
      tsconfig: "./test/tsconfig.json",
    },
  },
});
