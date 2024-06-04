import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../utils";

describe("link", () => {
  const testMap = new Map<string, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["links", "urlOnlyLink"],
      ["links", "urlTypeLink"],
      ["links", "namedLink"],
      ["links", "urlOnlyIssue"],
      ["links", "namedIssue"],
      ["links", "urlOnlyTms"],
      ["links", "namedTms"],
      ["links", "multipleLinks"],
    );
    for (const test of tests) {
      testMap.set(test.name as string, test as TestResult);
    }
  });

  it("url only link", () => {
    const links = testMap.get("a test with a url only link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
      },
    ]);
  });

  it("link type", () => {
    const links = testMap.get("a test with a link of a custom type")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        name: "baz",
        type: "qux",
      },
    ]);
  });

  it("named link", () => {
    const links = testMap.get("a test with a named link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        name: "baz",
      },
    ]);
  });

  it("url only issue", () => {
    const links = testMap.get("a test with a url only issue link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "issue",
      },
    ]);
  });

  it("named issue", () => {
    const links = testMap.get("a test with a named issue link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "issue",
        name: "baz",
      },
    ]);
  });

  it("url only tms", () => {
    const links = testMap.get("a test with a url only tms link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "tms",
      },
    ]);
  });

  it("named tms", () => {
    const links = testMap.get("a test with a named tms link")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "tms",
        name: "baz",
      },
    ]);
  });

  it("multiple", () => {
    const links = testMap.get("a test with two links")!.links;
    expect(links).toEqual([
      {
        url: "https://foo.bar",
        type: "link",
        name: "baz",
      },
      {
        url: "https://roo.rar",
        type: "link",
        name: "raz",
      },
    ]);
  });
});
