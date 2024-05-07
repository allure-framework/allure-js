import { Label } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { beforeAll, describe, expect, it } from "vitest";

describe("env labels", async () => {
  let labels: Label[];
  beforeAll(async () => {
    ({ tests: [{labels}] } = await runMochaInlineTest(
      {
        env: {
          ALLURE_LABEL_: "-",
          ALLURE_LABEL_A: "",
          ALLURE_LABEL_B: "foo",
          ALLURE_LABEL_b: "bar",
          ALLURE_LABEL_workerId: "baz",
          ALLURE_LABEL_language: "foobar",
        }
      },
      ["plain-mocha", "testInFileScope"]
    ));
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
    expect(labels).toMatchObject(
      expect.arrayContaining([
        { name: "language", value: "foobar" },
        { name: "language", value: "javascript" },
      ])
    );
  });
});

