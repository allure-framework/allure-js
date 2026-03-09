import { beforeAll, describe, expect, it } from "vitest";

import {
  type TestFileAccessor,
  createVitestBrowserConfig,
  createVitestConfig,
  runVitestInlineTest,
} from "../../../utils.js";

describe("parameters", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("sets parameters", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test } from "vitest";
    import { parameter } from "allure-js-commons";

    test("parameter", async () => {
      await parameter("foo", "bar", { mode: "hidden", excluded: true });
    });
  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].parameters).toContainEqual({
          name: "foo",
          value: "bar",
          mode: "hidden",
          excluded: true,
        });
      });
    });
  }
});
