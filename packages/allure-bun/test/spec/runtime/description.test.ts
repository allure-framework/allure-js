import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";

describe("description", () => {
  it("sets markdown description", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { description } from "allure-js-commons";

        test("description", async () => {
          await description("markdown description");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].description).toBe("markdown description");
  });

  it("sets html description", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { descriptionHtml } from "allure-js-commons";

        test("html description", async () => {
          await descriptionHtml("<b>html description</b>");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].descriptionHtml).toBe("<b>html description</b>");
  });

  it("adds descriptions from before fixtures to linked tests", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { description, descriptionHtml } from "allure-js-commons";

        beforeAll(async () => {
          await description("fixture markdown");
          await descriptionHtml("<i>fixture html</i>");
        });

        test("with fixture description", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0]).toEqual(
      expect.objectContaining({
        description: "fixture markdown",
        descriptionHtml: "<i>fixture html</i>",
      }),
    );
  });
});
