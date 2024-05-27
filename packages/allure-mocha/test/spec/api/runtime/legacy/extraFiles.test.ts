import { beforeAll, describe, expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils";

describe("legacy extra files API", () => {
  let envInfo: unknown, categories: unknown;
  beforeAll(async () => {
    ({ envInfo, categories } = await runMochaInlineTest(["legacy", "environmentInfo"], ["legacy", "categories"]));
  });

  it("the run should have an environment info", () => {
    expect(envInfo).toMatch(/foo = bar/);
    expect(envInfo).toMatch(/baz = qux/);
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
