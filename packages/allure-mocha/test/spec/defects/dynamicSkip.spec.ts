import { expect, it } from "vitest";
import { issue } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

it("shouldn't overwrite the result of a dynamically skipped test", async () => {
  await issue("457");

  const { tests } = await runMochaInlineTest(["labels", "skippedAtRuntime"], ["legacy", "labels", "skippedAtRuntime"]);

  expect(tests).toHaveLength(2);
  for (const test of tests) {
    expect(test).toMatchObject({
      labels: expect.arrayContaining([expect.objectContaining({ name: "tag", value: "foo" })]),
    });
  }
});
