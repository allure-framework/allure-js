import { runJestTests, TestResultsByFullName } from "../utils";

describe("label", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/labels.test.js"]);
  });

  it("adds custom label", () => {
    const { labels } = results.custom;

    labels.should.include.something.that.deep.equals({
      name: "foo",
      value: "bar",
    });
  });

  it("adds allureId label", () => {
    const { labels } = results.allureId;

    labels.should.include.something.that.deep.equals({
      name: "ALLURE_ID",
      value: "42",
    });
  });

  it("adds epic label", () => {
    const { labels } = results.epic;

    labels.should.include.something.that.deep.equals({
      name: "epic",
      value: "foo",
    });
  });

  it("adds owner label", () => {
    const { labels } = results.owner;

    labels.should.include.something.that.deep.equals({
      name: "owner",
      value: "foo",
    });
  });

  it("adds parentSuite label", () => {
    const { labels } = results.parentSuite;

    labels.should.include.something.that.deep.equals({
      name: "parentSuite",
      value: "foo",
    });
  });

  it("adds subSuite label", () => {
    const { labels } = results.subSuite;

    labels.should.include.something.that.deep.equals({
      name: "subSuite",
      value: "foo",
    });
  });

  it("adds severity label", () => {
    const { labels } = results.severity;

    labels.should.include.something.that.deep.equals({
      name: "severity",
      value: "foo",
    });
  });

  it("adds story label", () => {
    const { labels } = results.story;

    labels.should.include.something.that.deep.equals({
      name: "story",
      value: "foo",
    });
  });

  it("adds suite label", () => {
    const { labels } = results.suite;

    labels.should.include.something.that.deep.equals({
      name: "suite",
      value: "foo",
    });
  });

  it("adds tag label", () => {
    const { labels } = results.tag;

    labels.should.include.something.that.deep.equals({
      name: "tag",
      value: "foo",
    });
  });

  it("adds feature label", () => {
    const { labels } = results.feature;

    labels.should.include.something.that.deep.equals({
      name: "feature",
      value: "foo",
    });
  });
});
