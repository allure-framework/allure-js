import expect from "expect";
import { TestResultsByFullName, runJestTests } from "../utils";

describe("description", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/description.test.js"]);
  });

  it("adds markdown description", () => {
    const { description } = results.markdown;

    expect(description).toBe("foo");
  });

  it("adds custom history id", () => {
    const { descriptionHtml } = results.html;

    expect(descriptionHtml).toBe("foo");
  });
});
