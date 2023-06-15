import { Label, LabelName, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { runHermioneTests } from "../runner";

describe("labels", () => {
  describe("label", () => {
    it("adds `foo` label", async () => {
      const results = await runHermioneTests(["./test/fixtures/label.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === "foo") as Label;

      expect(label.name).eq("foo");
      expect(label.value).eq("bar");
    });
  });

  describe("allure id", () => {
    it("adds `42` allure id", async () => {
      const results = await runHermioneTests(["./test/fixtures/allureId.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.ALLURE_ID) as Label;

      expect(label.value).eq("42");
    });
  });

  describe("epic", () => {
    it("adds `foo` epic", async () => {
      const results = await runHermioneTests(["./test/fixtures/epic.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.EPIC) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("feature", () => {
    it("adds `foo` feature", async () => {
      const results = await runHermioneTests(["./test/fixtures/fixture.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.FEATURE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("story", () => {
    it("adds `foo` story", async () => {
      const results = await runHermioneTests(["./test/fixtures/story.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.STORY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("suite", () => {
    it("adds `foo` suite", async () => {
      const results = await runHermioneTests(["./test/fixtures/suite.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("parentSuite", () => {
    it("adds `foo` parentSuite", async () => {
      const results = await runHermioneTests(["./test/fixtures/parentSuite.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.PARENT_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("subSuite", () => {
    it("adds `foo` subSuite", async () => {
      const results = await runHermioneTests(["./test/fixtures/subSuite.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SUB_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("owner", () => {
    it("adds `foo` owner", async () => {
      const results = await runHermioneTests(["./test/fixtures/owner.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.OWNER) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("severity", () => {
    it("adds `foo` severity", async () => {
      const results = await runHermioneTests(["./test/fixtures/severity.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.SEVERITY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("tag", () => {
    it("adds `foo` tag", async () => {
      const results = await runHermioneTests(["./test/fixtures/tag.js"]);
      const { labels } = results[0];
      const label = labels.find(({ name }) => name === LabelName.TAG) as Label;

      expect(label.value).eq("foo");
    });
  });
});
