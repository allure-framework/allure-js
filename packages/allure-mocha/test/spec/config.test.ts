import { beforeAll, describe, expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runMochaInlineTest } from "../utils.js";

describe("configuration", () => {
  let envInfo: unknown, categories: unknown;
  beforeAll(async () => {
    ({ envInfo, categories } = await runMochaInlineTest(
      {
        environmentInfo: { foo: "bar", baz: "qux" },
        categories: [{
          name: "foo",
          description: "bar",
          messageRegex: "broken",
          matchedStatuses: [Status.BROKEN],
        }, {
          name: "baz",
          description: "qux",
          messageRegex: "failure",
          matchedStatuses: [Status.FAILED],
        }],
      },
      ["plain-mocha", "testInFileScope"],
    ));
  });

  it("applies environmentInfo", () => {
    expect(envInfo).toMatchObject({
      foo: "bar",
      baz: "qux",
    });
  });

  it("applies categories", () => {
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
