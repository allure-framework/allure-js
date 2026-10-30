import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../../../utils.js";

describe("precondition and expected result", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("sets markdown precondition and expected result", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test } from "vitest";
    import { expectedResult, precondition } from "allure-js-commons";

    test("markdown", async () => {
      await precondition("A registered user exists and is **signed out**.");
      await expectedResult("The user is redirected to the **dashboard**.");
    });
  `,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].precondition).toBe("A registered user exists and is **signed out**.");
      expect(tests[0].expectedResult).toBe("The user is redirected to the **dashboard**.");
      expect(tests[0]).not.toHaveProperty("preconditionHtml");
      expect(tests[0]).not.toHaveProperty("expectedResultHtml");
    });

    it("sets html precondition and expected result", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test } from "vitest";
    import { expectedResultHtml, preconditionHtml } from "allure-js-commons";

    test("html", async () => {
      await preconditionHtml("<p>A registered user exists and is <strong>signed out</strong>.</p>");
      await expectedResultHtml("<p>The user is redirected to the <strong>dashboard</strong>.</p>");
    });
  `,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].preconditionHtml).toBe("<p>A registered user exists and is <strong>signed out</strong>.</p>");
      expect(tests[0].expectedResultHtml).toBe("<p>The user is redirected to the <strong>dashboard</strong>.</p>");
      expect(tests[0]).not.toHaveProperty("precondition");
      expect(tests[0]).not.toHaveProperty("expectedResult");
    });
  });
});
