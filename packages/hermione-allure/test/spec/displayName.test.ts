import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("displayName", () => {
  it("sets custom test name", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("display name", async (ctx) => {
        await allure(ctx).displayName("foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].name).eq("foo");
  });
});
