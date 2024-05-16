import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons/sdk";
import { runCucumberInlineTest } from "../utils";

it("assigns unmatched tags as tags labels", async () => {
  const { tests } = await runCucumberInlineTest(["tags"], ["tags"]);

  expect(tests).toHaveLength(1);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "a",
      labels: expect.arrayContaining([
        {
          name: LabelName.TAG,
          value: "@foo",
        },
        {
          name: LabelName.TAG,
          value: "@bar",
        },
      ]),
    }),
  );
});
