import expect from "expect";
import { TestResultsByFullName, runJestTests } from "../utils";

describe("parameters", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/parameters.test.js"]);
  });

  it("adds custom parameter", () => {
    const { parameters } = results.custom;

    expect(parameters).toContainEqual(
      expect.objectContaining({
        name: "foo",
        value: "bar",
        excluded: false,
        mode: "hidden",
      }),
    );
  });
});
