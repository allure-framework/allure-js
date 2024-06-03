import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils";

describe("legacy link API", () => {
  const testMap = new Map<string, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["legacy", "links", "urlOnlyLink"],
      ["legacy", "links", "urlTypeLink"],
      ["legacy", "links", "namedLink"],
      ["legacy", "links", "issue"],
      ["legacy", "links", "tms"],
    );
    for (const test of tests) {
      testMap.set(test.name as string, test as TestResult);
    }
  });

  it("should have test with a url only link", () => {
    const links = testMap.get("a test with a url only link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
      },
    ]);
  });

  it("should have test with a link of a custom type", () => {
    const links = testMap.get("a test with a link of a custom type")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        name: "baz",
        type: "qux",
      },
    ]);
  });

  it("should have test with a named link", () => {
    const links = testMap.get("a test with a named link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        name: "baz",
      },
    ]);
  });

  it("should have test with an issue", () => {
    const links = testMap.get("a test with an issue link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "issue",
        name: "baz",
      },
    ]);
  });

  it("should have test with a tms", () => {
    const links = testMap.get("a test with a tms link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "tms",
        name: "baz",
      },
    ]);
  });
});
