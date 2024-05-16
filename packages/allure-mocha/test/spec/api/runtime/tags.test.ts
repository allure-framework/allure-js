import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../utils";

it("tags can be added at runtime", async () => {
  const { tests } = await runMochaInlineTest(["labels", "tags"]);

  expect(tests).toHaveLength(1);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "a test with tags",
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
