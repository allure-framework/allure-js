import expect from "expect";
import { runJestTests, TestResultsByFullName } from "../utils";
import { LabelName } from "allure-js-commons";

describe("labels", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/labels.test.js"]);
  });

  it("adds package label", () => {
    const { labels } = results.package;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.PACKAGE,
        value: "fixtures",
      }),
    );
  });

  it("adds custom label", () => {
    const { labels } = results.custom;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "foo",
        value: "bar",
      }),
    );
  });

  it("adds allureId label", () => {
    const { labels } = results.allureId;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "ALLURE_ID",
        value: "42",
      }),
    );
  });

  it("adds epic label", () => {
    const { labels } = results.epic;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "epic",
        value: "foo",
      }),
    );
  });

  it("adds owner label", () => {
    const { labels } = results.owner;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "owner",
        value: "foo",
      }),
    );
  });

  it("adds parentSuite label", () => {
    const { labels } = results.parentSuite;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "parentSuite",
        value: "foo",
      }),
    );
  });

  it("adds subSuite label", () => {
    const { labels } = results.subSuite;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "subSuite",
        value: "foo",
      }),
    );
  });

  it("adds severity label", () => {
    const { labels } = results.severity;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "severity",
        value: "foo",
      }),
    );
  });

  it("adds story label", () => {
    const { labels } = results.story;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "story",
        value: "foo",
      }),
    );
  });

  it("adds suite label", () => {
    const { labels } = results.suite;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "suite",
        value: "foo",
      }),
    );
  });

  it("adds tag label", () => {
    const { labels } = results.tag;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "tag",
        value: "foo",
      }),
    );
  });

  it("adds feature label", () => {
    const { labels } = results.feature;

    expect(labels).toContainEqual(
      expect.objectContaining({
        name: "feature",
        value: "foo",
      }),
    );
  });
});
