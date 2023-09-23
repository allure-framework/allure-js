import { expect } from "chai";
import { describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { runHermione } from "../helper/run_helper";

describe("historyId", () => {
  it("sets custom history id", async () => {
    const allureResults = await runHermione(["./test/fixtures/historyId.js"]);
    const { tests: results } = allureResults;

    const { historyId } = getTestResultByName(results, "historyId");

    expect(historyId).eq("foo");
  });
});
