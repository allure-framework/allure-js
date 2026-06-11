import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../../../utils.js";

describe("historyId", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("sets test history id", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test } from "vitest";
    import { historyId } from "allure-js-commons";

    test("history id", async () => {
      await historyId("foo");
    });
  `,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].historyId).toBe("foo");
    });
  });
});
