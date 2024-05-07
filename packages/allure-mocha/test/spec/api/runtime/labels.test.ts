import { TestResult } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../../utils";
import { beforeAll, expect, it, describe } from "vitest";

describe("label runtime API", async () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      ["labels", "custom"],
      ["labels", "multiple"],
    ));
  });

  it("may add a custom label to a test", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a custom label",
        labels: expect.arrayContaining([{
          name: "foo",
          value: "bar",
        }])
      }),
    );
  });

  it("may add multiple labels at once", async () => {
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
          }
        ]),
      }),
    );
  });
});
