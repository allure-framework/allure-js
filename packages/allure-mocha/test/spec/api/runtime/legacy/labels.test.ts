import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../../utils";

describe("legacy label runtime API", () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(["legacy", "labels", "custom"]));
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
});
