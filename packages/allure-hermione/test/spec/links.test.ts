import { Link, LinkType, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";
import Hermione from "hermione";

describe("links", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/links.js"], {});

    results = hermione.allure.writer.results;
  });

  it("adds `bar` custom link", async () => {
    const { links } = getTestResultByName(results, "custom");
    const link = links.find(({ type }) => type === "foo") as Link;

    expect(link.name).eq("bar");
    expect(link.url).eq("http://example.org");
  });

  it("adds `foo` tms link", async () => {
    const { links } = getTestResultByName(results, "tms");
    const link = links.find(({ type }) => type === LinkType.TMS) as Link;

    expect(link.name).eq("foo");
    expect(link.url).eq("http://example.org");
  });

  it("adds `foo` issue link", async () => {
    const { links } = getTestResultByName(results, "issue");
    const link = links.find(({ type }) => type === LinkType.ISSUE) as Link;

    expect(link.name).eq("foo");
    expect(link.url).eq("http://example.org");
  });
});
