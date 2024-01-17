import { expect } from "chai";
import { describe, it } from "mocha";
import { Link, LinkType, TestResult } from "allure-js-commons";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("links", () => {
  let results: TestResult[];

  before(async () => {
    const { tests } = await runHermione(["./test/fixtures/links.js"]);

    results = tests;
  });
  it("adds `bar` custom link", async () => {
    const { links } = getTestResultByName(results, "custom");
    const link = links.find(({ type }) => type === "foo") as Link;

    expect(link.name).eq("bar");
    expect(link.url).eq("https://example.org");
  });

  it("adds `foo` tms link", async () => {
    const { links } = getTestResultByName(results, "tms");
    const link = links.find(({ type }) => type === LinkType.TMS) as Link;

    expect(link.name).eq("foo");
    expect(link.url).eq("https://example.org");
  });

  it("adds `foo` issue link", async () => {
    const { links } = getTestResultByName(results, "issue");
    const link = links.find(({ type }) => type === LinkType.ISSUE) as Link;

    expect(link.name).eq("foo");
    expect(link.url).eq("https://example.org");
  });
});
