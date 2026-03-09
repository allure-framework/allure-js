import { beforeAll, describe, expect, it } from "vitest";

import {
  type TestFileAccessor,
  createVitestBrowserConfig,
  createVitestConfig,
  runVitestInlineTest,
} from "../../../utils.js";

describe("displayName", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("sets test display name", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test } from "vitest";
    import { displayName } from "allure-js-commons";

    test("display name", async () => {
      await displayName("foo");
    });
  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].name).toBe("foo");
      });
    });
  }
});
