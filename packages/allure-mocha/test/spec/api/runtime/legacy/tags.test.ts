import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils.js";

it("tags can be added via legacy API", async () => {
  const { tests } = await runMochaInlineTest(["legacy", "labels", "tags"]);

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
