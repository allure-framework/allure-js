import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { getTestByName } from "../helpers.js";

describe("parameters", () => {
  it("sets test parameters", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { parameter } from "allure-js-commons";

        test("parameter", async () => {
          await parameter("plain", "value");
          await parameter("masked", "masked value", { mode: "masked" });
          await parameter("default", "default value", { mode: "default" });
          await parameter("secret", "hidden", { mode: "hidden", excluded: true });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].parameters).toEqual(
      expect.arrayContaining([
        { name: "plain", value: "value" },
        { name: "masked", value: "masked value", mode: "masked" },
        { name: "default", value: "default value", mode: "default" },
        { name: "secret", value: "hidden", mode: "hidden", excluded: true },
      ]),
    );
  });

  it("adds parameters from hooks to the current test", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeEach, test } from "bun:test";
        import { parameter } from "allure-js-commons";

        beforeEach(async () => {
          await parameter("fromHook", "yes", { excluded: true });
        });

        test("with hook parameter", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(getTestByName(tests, "with hook parameter").parameters).toContainEqual({
      name: "fromHook",
      value: "yes",
      excluded: true,
    });
  });
});
