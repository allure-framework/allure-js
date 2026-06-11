import { describe, expect, it } from "vitest";

import { type TestFileAccessor, reporterModulePath, runVitestInlineTest } from "../utils.js";

const nodeConfig: TestFileAccessor = ({ allureResultsPath }) => `
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      reporters: [
        "default",
        [
          "${reporterModulePath}",
          {
            resultsDir: "${allureResultsPath}",
            categories: [{
              name: "first"
            },{
              name: "second"
            }]
          }
        ],
      ],
    },
  });
`;

const browserConfig: TestFileAccessor = ({ allureResultsPath }) => `
  import { defineConfig } from "vitest/config";
  import { playwright } from "@vitest/browser-playwright";

  export default defineConfig({
    test: {
      openTelemetry: { enabled: false },
      reporters: [
        "default",
        [
          "${reporterModulePath}",
          {
            resultsDir: "${allureResultsPath}",
            categories: [{
              name: "first"
            },{
              name: "second"
            }]
          }
        ],
      ],
      browser: {
        provider: playwright(),
        enabled: true,
        headless: true,
        instances: [{ browser: "chromium" }],
      },
    },
  });
`;

const testEnvironments = [
  ["node", nodeConfig],
  ["browser", browserConfig],
] as const;

describe("categories", () => {
  describe.each(testEnvironments)('for "%s"', (_env, configFileAccessor) => {
    it("should support categories", async () => {
      const { categories } = await runVitestInlineTest({
        "sample.test.ts": `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
        "vitest.config.ts": configFileAccessor,
      });

      expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
    });
  });
});
