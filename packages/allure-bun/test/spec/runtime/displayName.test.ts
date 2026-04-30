import { describe, expect } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { bunIt, hasFixtureStep } from "../helpers.js";

describe("displayName", () => {
  bunIt("sets test display name", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { displayName } from "allure-js-commons";

        test("display name", async () => {
          await displayName("runtime display name");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].name).toBe("runtime display name");
    expect(tests[0].fullName).toBe("sample.test.ts#display name");
  });

  bunIt("renames fixtures without renaming tests", async () => {
    const { tests, groups, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { displayName, logStep } from "allure-js-commons";

        beforeAll(async () => {
          await displayName("renamed before all");
          await logStep("fixture step");
        });

        test("uses fixture", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].name).toBe("uses fixture");
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "renamed before all",
          befores: expect.arrayContaining([expect.objectContaining({ name: "renamed before all" })]),
        }),
      ]),
    );
    expect(hasFixtureStep(groups, "befores", "fixture step")).toBe(true);
  });
});
