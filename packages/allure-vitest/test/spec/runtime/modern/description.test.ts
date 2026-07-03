import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../../../utils.js";

describe("description", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
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
});
