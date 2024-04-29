import { Label } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { beforeAll, describe, expect, it } from "vitest";

describe("", async () => {
  let labels: Label[];
  beforeAll(async () => {
    const env = {
      ALLURE_LABEL_: "-",
      ALLURE_LABEL_A: "",
      ALLURE_LABEL_B: "foo",
      ALLURE_LABEL_b: "bar",
      ALLURE_LABEL_workerId: "baz",
      ALLURE_LABEL_language: "foobar",
    };
    const results = await runMochaInlineTest({env}, "minimal");
    labels = results.tests[0].labels;
  });

  it("no label with empty name", async () => {
    expect(labels).not.toContainEqual(expect.objectContaining({name: ""}));
  });

  it("no label with empty value", async () => {
    expect(labels).not.toContainEqual(expect.objectContaining({value: ""}));
  });

  it("workerId is present", async () => {
    expect(labels).toContainEqual({ name: "workerId", value: "baz" });
  });

  it("global label takes precedence over the initial one", async () => {
    expect(labels).toContainEqual({ name: "language", value: "foobar" });
    expect(labels).toContainEqual({ name: "language", value: "javascript" });
  });
});

