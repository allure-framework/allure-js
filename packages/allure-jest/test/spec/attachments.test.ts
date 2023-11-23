import expect from "expect";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("attachments", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/attachments.test.js"]);
  });

  it("adds markdown description", () => {
    const { attachments } = results.json;

    expect(attachments).toContainEqual(
      expect.objectContaining({
        name: "Attachment",
        type: "application/json",
      }),
    );
  });
});
