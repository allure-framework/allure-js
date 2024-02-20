import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("historyId", () => {
  it("sets custom history id", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("history id", async ({ currentTest }) => {
        await allure(currentTest).historyId("foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].historyId).eq("foo");
  });
});
