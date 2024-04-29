import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it, test } from "vitest";
import { TestResult, Severity } from "allure-js-commons/new/sdk/node";

describe("runtime metadata", async () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      "testDisplayName",
      "description",
      "descriptionHtml",
      "owner",
      "severity",
      "layer",
    ));
  });

  it("contains a renamed test", async () => {
    const result = tests.find((t) => t.fullName?.endsWith("displayName"));

    expect(result?.name).toEqual("foo");
  });

  it("contains a test with a description", async () => {
    const result = tests.find((t) => t.name === "description");

    expect(result?.description).toEqual("foo");
  });

  it("contains a test with a descriptionHtml", async () => {
    const result = tests.find((t) => t.name === "descriptionHtml");

    expect(result?.descriptionHtml).toEqual("foo");
  });

  it("contains a test with an owner", async () => {
    const result = tests.find((t) => t.name === "owner");

    expect(result?.labels).toContainEqual({name: "owner", value: "foo"});
  });

  test.each([
    Severity.BLOCKER,
    Severity.CRITICAL,
    Severity.NORMAL,
    Severity.MINOR,
    Severity.TRIVIAL,
  ])("contains a %s test", async (s) => {
    const result = tests.find((t) => t.name === `severity '${s}'`);

    expect(result?.labels).toContainEqual({name: "severity", value: s});
  });

  it("contains a test with a layer", async () => {
    const result = tests.find((t) => t.name === "layer");

    expect(result?.labels).toContainEqual({name: "layer", value: "foo"});
  });
});
