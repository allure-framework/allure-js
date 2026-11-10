import { LabelName } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../../../utils.js";

it("handles runtime labels", async () => {
  const { tests } = await runCucumberInlineTest(["labels"], ["runtime/modern/labels"]);

  expect(tests).toHaveLength(3);
  expect(
    Object.fromEntries(
      tests.map(({ name, labels }) => [
        name,
        labels
          .filter(({ name: labelName }) => labelName === LabelName.FEATURE)
          .map(({ value }) => value)
          .sort(),
      ]),
    ),
  ).toEqual({
    "without labels": ["with labels"],
    "with labels": ["global"],
    "with runtime labels": ["foo", "second feature"],
  });

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
