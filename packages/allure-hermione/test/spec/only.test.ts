import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermione } from "../helper/run_helper";

describe("only", () => {
  it("reports only one spec", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/only.js"]);

    expect(results).length(1);
    expect(results[0].name).eq("third");
  });
});
