import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";

describe("only", () => {
  it("reports only one spec", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      it("first", () => {});

      it("second", () => {});

      it.only("third", () => {});
    `);

    expect(tests).length(1);
    expect(tests[0].name).eq("third");
  });
});
