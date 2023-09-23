import { expect } from "chai";
import { describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { runHermione } from "../helper/run_helper";

describe("testCaseId", () => {
  it("sets custom test case id", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/testCaseId.js"]);

    const { testCaseId } = getTestResultByName(results, "testCaseId");

    expect(testCaseId).eq("foo");
  });
});
