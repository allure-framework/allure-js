import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("testCaseId", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/testCaseId.test.js"]);
  });

  it("adds custom history id", () => {
    const { testCaseId } = results.testCaseId;

    expect(testCaseId).eq("foo");
  });
});
