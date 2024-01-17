import expect from "expect";
import { TestResultsByFullName, runJestTests } from "../utils";

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

  it("adds markdown description with name", () => {
    const { attachments } = results["with name"];

    expect(attachments).toContainEqual(
      expect.objectContaining({
        name: "Request Body",
        type: "application/json",
      }),
    );
  });
});
