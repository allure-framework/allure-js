import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../utils.js";

describe("label runtime API", () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(["labels", "custom"], ["labels", "multiple"]));
  });

  it("may add a custom label to a test", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a custom label",
        labels: expect.arrayContaining([
          {
            name: "foo",
            value: "bar",
          },
        ]),
      }),
    );
  });

  it("may add multiple labels at once", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with two custom labels",
        labels: expect.arrayContaining([
          {
            name: "foo",
            value: "bar",
          },
          {
            name: "baz",
            value: "qux",
          },
        ]),
      }),
    );
  });
});
