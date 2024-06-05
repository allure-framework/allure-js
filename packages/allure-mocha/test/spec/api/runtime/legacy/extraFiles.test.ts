import { beforeAll, describe, expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils.js";

describe("legacy extra files API", () => {
  let envInfo: unknown, categories: unknown;
  beforeAll(async () => {
    ({ envInfo, categories } = await runMochaInlineTest(["legacy", "environmentInfo"], ["legacy", "categories"]));
  });

  it("the run should have an environment info", () => {
    expect(envInfo).toMatchObject({
      foo: "bar",
      baz: "qux",
    });
  });

  it("the run should have categories", () => {
    expect(categories).toEqual([
      {
        name: "foo",
        description: "bar",
        messageRegex: "broken",
        matchedStatuses: [Status.BROKEN],
      },
      {
        name: "baz",
        description: "qux",
        messageRegex: "failure",
        matchedStatuses: [Status.FAILED],
      },
    ]);
  });
});
