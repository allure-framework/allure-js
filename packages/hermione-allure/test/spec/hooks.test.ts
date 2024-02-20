import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("hooks", () => {
  it("applies commands from `beforeEach` and `afterEach` for each test", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      describe("hooks", () => {
        beforeEach(async (ctx) => {
          await allure(ctx).label("hook", "before");
        });

        afterEach(async (ctx) => {
          await allure(ctx).label("hook", "after");
        });

        it("first test", () => {});

        it("second test", () => {});

        it("third test", () => {});
      });
    `);

    expect(tests).length(3);
    tests[0].labels.should.contain.something.like({ name: "hook", value: "before" });
    tests[0].labels.should.contain.something.like({ name: "hook", value: "after" });
    tests[1].labels.should.contain.something.like({ name: "hook", value: "before" });
    tests[1].labels.should.contain.something.like({ name: "hook", value: "after" });
    tests[2].labels.should.contain.something.like({ name: "hook", value: "before" });
    tests[2].labels.should.contain.something.like({ name: "hook", value: "after" });
  });
});
