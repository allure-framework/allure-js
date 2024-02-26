import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("testCaseId", () => {
  it("sets custom test case id", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("test case id", async ({ currentTest }) => {
        await allure(currentTest).testCaseId("foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].testCaseId).eq("foo");
  });
});
