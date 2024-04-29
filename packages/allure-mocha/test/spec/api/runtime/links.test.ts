import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new/sdk/node";

describe("link", async () => {
  const testMap = new Map<string, TestResult>();
  beforeAll(async () => {
    const {tests} = await runMochaInlineTest(
      ["links", "urlOnlyLink"],
      ["links", "urlTypeLink"],
      ["links", "namedLink"],
      ["links", "urlOnlyIssue"],
      ["links", "namedIssue"],
      ["links", "urlOnlyTms"],
      ["links", "namedTms"],
    );
    for (const test of tests) {
      testMap.set(test.name!, test);
    }
  });

  it("url only link", async () => {
    const links = testMap.get("url only link")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
    }]);
  });

  it("link type", async () => {
    const links = testMap.get("link type")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "baz",
    }]);
  });

  it("named link", async () => {
    const links = testMap.get("named link")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "link",
      name: "baz",
    }]);
  });

  it("url only issue", async () => {
    const links = testMap.get("url only issue")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "issue",
    }]);
  });

  it("named issue", async () => {
    const links = testMap.get("named issue")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "issue",
      name: "baz",
    }]);
  });

  it("url only tms", async () => {
    const links = testMap.get("url only tms")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "tms",
    }]);
  });

  it("named tms", async () => {
    const links = testMap.get("named tms")!.links;
    expect(links).toEqual([{
      url: "https://foo.bar",
      type: "tms",
      name: "baz",
    }]);
  });
});
