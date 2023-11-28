import expect from "expect";
import { runJestTests, TestResultsByFullName } from "../utils";

/**
 * Issues and TMS links templates are defined in `test/jest.config.js`
 */
describe("links", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/links.test.js"]);
  });

  it("adds custom link", () => {
    const { links } = results.custom;

    expect(links).toContainEqual(
      expect.objectContaining({
        type: "foo",
        name: "bar",
        url: "http://example.org",
      }),
    );
  });

  it("adds tms link", () => {
    const { links } = results.tms;

    expect(links).toContainEqual(
      expect.objectContaining({
        type: "tms",
        name: "foo",
        url: "http://example.org/tasks/1",
      }),
    );
  });

  it("adds issue link", () => {
    const { links } = results.issue;

    expect(links).toContainEqual(
      expect.objectContaining({
        type: "issue",
        name: "foo",
        url: "http://example.org/issues/1",
      }),
    );
  });
});
