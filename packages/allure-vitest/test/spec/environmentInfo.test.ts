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
            environmentInfo: {
              "app version": "123.0.1",
              "some other key": "some other value"
            }
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
            environmentInfo: {
              "app version": "123.0.1",
              "some other key": "some other value"
            }
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

describe("environment info", () => {
  describe.each(testEnvironments)('for "%s"', (_env, configFileAccessor) => {
    it("should add environmentInfo", async () => {
      const { envInfo } = await runVitestInlineTest({
        "sample.test.ts": `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
        "vitest.config.ts": configFileAccessor,
      });

      expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
    });
  });
});
