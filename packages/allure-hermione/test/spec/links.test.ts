import { Link, LinkType, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { getHermioneTestResult } from "../runner";

describe("links", () => {
  describe("link", () => {
    it("adds `foo` label", async () => {
      const { links } = getHermioneTestResult("link.js")[0];
      const link = links.find(({ type }) => type === "foo") as Link;

      expect(link.name).eq("bar");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("tms", () => {
    it("adds `foo` tms link", async () => {
      const { links } = getHermioneTestResult("tms.js")[0];
      const link = links.find(({ type }) => type === LinkType.TMS) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("issue", () => {
    it("adds `foo` issue link", async () => {
      const { links } = getHermioneTestResult("issue.js")[0];
      const link = links.find(({ type }) => type === LinkType.ISSUE) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });
});
