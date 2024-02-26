import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("attachments", () => {
  it("adds json attachment", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async ({ currentTest }) => {
        await allure(currentTest).attachment(JSON.stringify({ foo: "bar" }), "application/json", "foo");
      });
    `);

    expect(tests).length(1);
    expect(tests[0].attachments).length(1);

    const [attachment] = tests[0].attachments;

    expect(attachment.name).eq("foo");
    expect(attachment.type).eq("application/json");
    expect(JSON.parse(attachments[attachment.source] as string)).eql({ foo: "bar" });
  });
});
