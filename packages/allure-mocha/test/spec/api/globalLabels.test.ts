import { beforeAll, describe, expect, it } from "vitest";
import { Label, LabelName } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils";

describe("env labels", () => {
  let labels: Label[];
  beforeAll(async () => {
    ({
      tests: [{ labels }],
    } = await runMochaInlineTest(
      {
        env: {
          ALLURE_LABEL_: "-",
          ALLURE_LABEL_A: "",
          ALLURE_LABEL_B: "foo",
          ALLURE_LABEL_b: "bar",
          ALLURE_LABEL_workerId: "baz",
          ALLURE_LABEL_language: "foobar",
        },
      },
      ["plain-mocha", "testInFileScope"],
    ));
  });

  it("no label with empty name", () => {
    expect(labels).not.toContainEqual(expect.objectContaining({ name: "" }));
  });

  it("no label with empty value", () => {
    expect(labels).not.toContainEqual(expect.objectContaining({ value: "" }));
  });

  it("workerId is present", () => {
    expect(labels).toContainEqual({ name: "workerId", value: "baz" });
  });

  it("global label takes precedence over the initial one", () => {
    expect(labels).toMatchObject(
      expect.arrayContaining([
        { name: LabelName.LANGUAGE, value: "foobar" },
        { name: LabelName.LANGUAGE, value: "javascript" },
      ]),
    );
  });
});
