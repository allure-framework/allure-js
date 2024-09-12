import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCucumberInlineTest } from "../../../utils.js";

it("handles runtime labels", async () => {
  const { tests } = await runCucumberInlineTest(["labels"], ["runtime/legacy/labels"], { parallel: false });

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "without labels",
      labels: expect.arrayContaining([
        {
          name: LabelName.SEVERITY,
          value: "global",
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "with labels",
      labels: expect.arrayContaining([
        {
          name: LabelName.SEVERITY,
          value: "global",
        },
        {
          name: LabelName.FEATURE,
          value: "global",
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "with runtime labels",
      labels: expect.arrayContaining([
        {
          name: LabelName.SEVERITY,
          value: "global",
        },
        {
          name: LabelName.ALLURE_ID,
          value: "foo",
        },
        {
          name: LabelName.EPIC,
          value: "foo",
        },
        {
          name: LabelName.FEATURE,
          value: "foo",
        },
        {
          name: LabelName.LAYER,
          value: "foo",
        },
        {
          name: LabelName.OWNER,
          value: "foo",
        },
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUB_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUITE,
          value: "foo",
        },
        {
          name: LabelName.SEVERITY,
          value: "foo",
        },
        {
          name: LabelName.STORY,
          value: "foo",
        },
        {
          name: LabelName.TAG,
          value: "foo",
        },
      ]),
    }),
  );
});
