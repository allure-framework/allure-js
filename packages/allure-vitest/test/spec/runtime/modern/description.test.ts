import { beforeAll, describe, expect, it } from "vitest";

import {
  type TestFileAccessor,
  createVitestBrowserConfig,
  createVitestConfig,
  runVitestInlineTest,
} from "../../../utils.js";

describe("description", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
      });

      it("sets description", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test } from "vitest";
    import { description } from "allure-js-commons";

    test("description", async () => {
      await description("foo");
    });
  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].description).toBe("foo");
      });

      it("sets html description", async () => {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
    import { test } from "vitest";
    import { descriptionHtml } from "allure-js-commons";

    test("description html", async () => {
      await descriptionHtml("foo");
    });
  `,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].descriptionHtml).toBe("foo");
      });
    });
  }
});
