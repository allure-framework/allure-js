import { Link, LinkType } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../types";

describe("links", () => {
  let hermione: HermioneAllure;

  beforeEach(() => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
  });

  describe("link", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/link.js"], {});
    });

    it("adds `foo` label", () => {
      const { links } = hermione.allure.writer.results[0];
      const link = links.find(({ type }) => type === "foo") as Link;

      expect(link.name).eq("bar");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("tms", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/tms.js"], {});
    });

    it("adds `foo` tms link", () => {
      const { links } = hermione.allure.writer.results[0];
      const link = links.find(({ type }) => type === LinkType.TMS) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });

  describe("issue", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/issue.js"], {});
    });

    it("adds `foo` issue link", () => {
      const { links } = hermione.allure.writer.results[0];
      const link = links.find(({ type }) => type === LinkType.ISSUE) as Link;

      expect(link.name).eq("foo");
      expect(link.url).eq("http://example.org");
    });
  });
});
