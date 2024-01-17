import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("historyId", () => {
  it("sets custom history id", async () => {
    const allureResults = await runHermione(["./test/fixtures/historyId.js"]);
    const { tests: results } = allureResults;

    const { historyId } = getTestResultByName(results, "historyId");

    expect(historyId).eq("foo");
  });
});
