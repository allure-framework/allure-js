import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("attachments", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/attachments.test.js"]);
  });

  it("adds markdown description", () => {
    const { attachments } = results.json;

    attachments.should.include.something.like({
      name: "Attachment",
      type: "application/json",
    });
  });
});
