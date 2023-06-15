import { Label, LabelName, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { getHermioneTestResult } from "../runner";

describe("labels", () => {
  describe("label", () => {
    it("adds `foo` label", async () => {
      const { labels } = getHermioneTestResult("label.js")[0];
      const label = labels.find(({ name }) => name === "foo") as Label;

      expect(label.name).eq("foo");
      expect(label.value).eq("bar");
    });
  });

  describe("allure id", () => {
    it("adds `42` allure id", async () => {
      const { labels } = getHermioneTestResult("allureId.js")[0];
      const label = labels.find(({ name }) => name === LabelName.ALLURE_ID) as Label;

      expect(label.value).eq("42");
    });
  });

  describe("epic", () => {
    it("adds `foo` epic", async () => {
      const { labels } = getHermioneTestResult("epic.js")[0];
      const label = labels.find(({ name }) => name === LabelName.EPIC) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("feature", () => {
    it("adds `foo` feature", async () => {
      const { labels } = getHermioneTestResult("feature.js")[0];
      const label = labels.find(({ name }) => name === LabelName.FEATURE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("story", () => {
    it("adds `foo` story", async () => {
      const { labels } = getHermioneTestResult("story.js")[0];
      const label = labels.find(({ name }) => name === LabelName.STORY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("suite", () => {
    it("adds `foo` suite", async () => {
      const { labels } = getHermioneTestResult("suite.js")[0];
      const label = labels.find(({ name }) => name === LabelName.SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("parentSuite", () => {
    it("adds `foo` parentSuite", async () => {
      const { labels } = getHermioneTestResult("parentSuite.js")[0];
      const label = labels.find(({ name }) => name === LabelName.PARENT_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("subSuite", () => {
    it("adds `foo` subSuite", async () => {
      const { labels } = getHermioneTestResult("subSuite.js")[0];
      const label = labels.find(({ name }) => name === LabelName.SUB_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("owner", () => {
    it("adds `foo` owner", async () => {
      const { labels } = getHermioneTestResult("owner.js")[0];
      const label = labels.find(({ name }) => name === LabelName.OWNER) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("severity", () => {
    it("adds `foo` severity", async () => {
      const { labels } = getHermioneTestResult("severity.js")[0];
      const label = labels.find(({ name }) => name === LabelName.SEVERITY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("tag", () => {
    it("adds `foo` tag", async () => {
      const { labels } = getHermioneTestResult("tag.js")[0];
      const label = labels.find(({ name }) => name === LabelName.TAG) as Label;

      expect(label.value).eq("foo");
    });
  });
});
