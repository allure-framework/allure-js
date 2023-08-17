import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("historyId", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/historyId.test.js"]);
  });

  it("adds custom history id", () => {
    const { historyId } = results.historyId;

    expect(historyId).eq("foo");
  });
});
