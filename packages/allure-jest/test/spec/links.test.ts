import { runJestTests, TestResultsByFullName } from "../utils";

describe("links", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/links.test.js"]);
  });

  it("adds custom link", () => {
    const { links } = results.custom;

    links.should.include.something.that.deep.equals({
      type: "foo",
      name: "bar",
      url: "http://example.org",
    });
  });

  it("adds tms link", () => {
    const { links } = results.tms;

    links.should.include.something.that.deep.equals({
      type: "tms",
      name: "foo",
      url: "http://example.org",
    });
  });

  it("adds issue link", () => {
    const { links } = results.issue;

    links.should.include.something.that.deep.equals({
      type: "issue",
      name: "foo",
      url: "http://example.org",
    });
  });
});
