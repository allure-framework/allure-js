import { expect } from "chai";
import { LinkType } from "allure-js-commons";
import { runHermioneInlineTest } from "../utils";

describe("labels", () => {
  it("adds `bar` custom link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async (ctx) => {
        await allure(ctx).link("https://example.org", "bar", "foo");
      });
    `);

    expect(tests).length(1);
    tests[0].links.should.contain.something.like({ name: "bar", url: "https://example.org", type: "foo" });
  });

  it("adds `foo` tms link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("tms", async (ctx) => {
        await allure(ctx).tms("https://example.org", "foo");
      });
    `);

    expect(tests).length(1);
    tests[0].links.should.contain.something.like({ name: "foo", url: "https://example.org", type: LinkType.TMS });
  });

  it("adds `foo` issue link", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("issue", async (ctx) => {
        await allure(ctx).issue("https://example.org", "foo");
      });
    `);

    expect(tests).length(1);
    tests[0].links.should.contain.something.like({ name: "foo", url: "https://example.org", type: LinkType.ISSUE });
  });
});
