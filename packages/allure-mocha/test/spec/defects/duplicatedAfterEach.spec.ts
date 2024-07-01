import { expect, it } from "vitest";
import { issue } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

it("should isolate afterEach containers", async () => {
  await issue("236");

  const { tests, groups } = await runMochaInlineTest(["fixtures", "afterEachTwoTests"]);

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        children: [tests[0].uuid],
      }),
      expect.objectContaining({
        children: [tests[1].uuid],
      }),
    ]),
  );
});
