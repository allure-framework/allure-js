import { runJestTests, TestResultsByFullName } from "../utils";

describe("parameters", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/parameters.test.js"]);
  });

  it("adds custom parameter", () => {
    const { parameters } = results.custom;

    parameters.should.include.something.that.deep.equals({
      name: "foo",
      value: "bar",
      excluded: false,
      mode: "hidden",
    });
  });
});
