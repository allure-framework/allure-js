import { describe, expect } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { bunIt } from "../helpers.js";

describe("description", () => {
  bunIt("sets markdown description", async () => {
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

  bunIt("sets html description", async () => {
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

  bunIt("adds descriptions from before fixtures to linked tests", async () => {
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
