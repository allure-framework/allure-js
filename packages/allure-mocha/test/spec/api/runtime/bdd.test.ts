import { LabelName } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new";

describe("runtime bdd labels", async () => {
  let tests: TestResult[] = [];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest("epic", "feature", "story"));
  });

  it("contains a test with an epic", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-epic",
        labels: expect.arrayContaining([
          {
            name: LabelName.EPIC,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("contains a test with a feature", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-feature",
        labels: expect.arrayContaining([
          {
            name: LabelName.FEATURE,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("contains a test with a story", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-story",
        labels: expect.arrayContaining([
          {
            name: LabelName.STORY,
            value: "foo",
          },
        ]),
      }),
    );
  });
});
