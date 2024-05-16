import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons";
import { LabelName } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../utils";

describe("bdd labels", () => {
  let tests: TestResult[] = [];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      ["labels", "bdd", "epic"],
      ["labels", "bdd", "feature"],
      ["labels", "bdd", "story"],
    ));
  });

  it("an epic can be added at runtime", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with an epic",
        labels: expect.arrayContaining([
          {
            name: LabelName.EPIC,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("a feature can be added at runtime", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a feature",
        labels: expect.arrayContaining([
          {
            name: LabelName.FEATURE,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("a story can be added at runtime", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a story",
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
