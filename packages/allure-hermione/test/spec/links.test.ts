import { Link, LinkType, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { runHermioneTests } from "../runner";

describe("links", () => {
  let results: TestResult[];

  describe("link", () => {
    before(async () => {
      results = await runHermioneTests(["./test/fixtures/link.js"]);
    });

    it("adds `foo` label", () => {
      const { links } = results[0];
      const link = links.find(({ type }) => type === "foo") as Link;

      expect(link.name).eq("bar");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("tms", () => {
    before(async () => {
      results = await runHermioneTests(["./test/fixtures/tms.js"]);
    });

    it("adds `foo` tms link", () => {
      const { links } = results[0];
      const link = links.find(({ type }) => type === LinkType.TMS) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("issue", () => {
    before(async () => {
      results = await runHermioneTests(["./test/fixtures/issue.js"]);
    });

    it("adds `foo` issue link", () => {
      const { links } = results[0];
      const link = links.find(({ type }) => type === LinkType.ISSUE) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });
});
