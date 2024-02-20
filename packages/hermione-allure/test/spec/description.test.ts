import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("description", () => {
  it("adds `foo` markdown description", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("description", async ({ currentTest }) => {
        await allure(currentTest).description("foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].description).eq("foo");
  });

  it("adds `foo` html description", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("description html", async ({ currentTest }) => {
        await allure(currentTest).descriptionHtml("foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].descriptionHtml).eq("foo");
  });
});
