import { expect } from "chai";
import { LinkType } from "allure-js-commons";
import { runHermioneInlineTest } from "../utils";

describe("links", () => {
  it("adds `bar` custom link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async ({ currentTest }) => {
        await allure(currentTest).link("https://example.org", "bar", "foo");
      });
    `);

    expect(tests).length(1);
    tests[0].links.should.contain.something.like({ name: "bar", url: "https://example.org", type: "foo" });
  });

  it("adds `foo` tms link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("tms", async ({ currentTest }) => {
        await allure(currentTest).tms("https://example.org", "foo");
        await allure(currentTest).tms("1", "bar");
        await allure(currentTest).tms("2", "baz");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].links).length(3);
    tests[0].links.should.contain.something.like({ name: "foo", url: "https://example.org", type: LinkType.TMS });
    tests[0].links.should.contain.something.like({
      name: "bar",
      url: "https://example.org/task/1",
      type: LinkType.TMS,
    });
    tests[0].links.should.contain.something.like({
      name: "baz",
      url: "https://example.org/task/2",
      type: LinkType.TMS,
    });
  });

  it("adds `foo` issue link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("issue", async ({ currentTest }) => {
        await allure(currentTest).issue("https://example.org", "foo");
        await allure(currentTest).issue("1", "bar");
        await allure(currentTest).issue("2", "baz");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].links).length(3);
    tests[0].links.should.contain.something.like({ name: "foo", url: "https://example.org", type: LinkType.ISSUE });
    tests[0].links.should.contain.something.like({
      name: "bar",
      url: "https://example.org/issue/1",
      type: LinkType.ISSUE,
    });
    tests[0].links.should.contain.something.like({
      name: "baz",
      url: "https://example.org/issue/2",
      type: LinkType.ISSUE,
    });
  });
});
