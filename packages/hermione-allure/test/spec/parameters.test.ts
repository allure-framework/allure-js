import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("parameters", () => {
  it("adds `foo` custom parameter", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("parameter", async ({ currentTest }) => {
        await allure(currentTest).parameter("foo", "bar", {
          excluded: false,
          mode: "hidden",
        });
      });
    `);

    expect(tests).length(1);
    tests[0].parameters.should.contain.something.like({
      name: "foo",
      value: "bar",
      excluded: false,
      mode: "hidden",
    });
  });
});
