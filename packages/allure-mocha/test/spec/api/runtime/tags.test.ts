import { LabelName } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../../utils";
import { expect, it } from "vitest";

it("Tag can be added at runtime", async () => {
  const { tests } = await runMochaInlineTest("tags");

  expect(tests).toHaveLength(1);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "dynamic-tags",
      labels: expect.arrayContaining([
        {
          name: LabelName.TAG,
          value: "foo",
        },
        {
          name: LabelName.TAG,
          value: "bar",
        },
      ]),
    }),
  );
});