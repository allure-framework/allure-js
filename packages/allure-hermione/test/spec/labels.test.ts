import { Label, LabelName, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { runHermioneTests } from "../runner";

describe("labels", () => {
  let results: TestResult[];

  describe("label", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/label.js"]);
    });

    it("adds `foo` label", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === "foo") as Label;

      expect(label.name).eq("foo");
      expect(label.value).eq("bar");
    });
  });

  describe("allure id", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/allureId.js"]);
    });

    it("adds `42` allure id", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.ALLURE_ID) as Label;

      expect(label.value).eq("42");
    });
  });

  describe("epic", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/epic.js"]);
    });

    it("adds `foo` epic", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.EPIC) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("feature", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/feature.js"]);
    });

    it("adds `foo` feature", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.FEATURE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("story", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/story.js"]);
    });

    it("adds `foo` story", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.STORY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("suite", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/suite.js"]);
    });

    it("adds `foo` suite", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("parentSuite", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/parentSuite.js"]);
    });

    it("adds `foo` parentSuite", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.PARENT_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("subSuite", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/subSuite.js"]);
    });

    it("adds `foo` subSuite", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SUB_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("owner", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/owner.js"]);
    });

    it("adds `foo` owner", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.OWNER) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("severity", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/severity.js"]);
    });

    it("adds `foo` severity", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SEVERITY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("tag", () => {
    beforeEach(async () => {
      results = await runHermioneTests(["./test/fixtures/tag.js"]);
    });

    it("adds `foo` tag", () => {
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.TAG) as Label;

      expect(label.value).eq("foo");
    });
  });
});
