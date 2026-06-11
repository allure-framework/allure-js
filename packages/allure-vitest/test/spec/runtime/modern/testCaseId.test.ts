import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../../../utils.js";

describe("testCaseId", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("sets test case id", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test } from "vitest";
    import { testCaseId } from "allure-js-commons";

    test("test case id", async () => {
      await testCaseId("foo");
    });
  `,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].testCaseId).toBe("foo");
    });
  });
});
