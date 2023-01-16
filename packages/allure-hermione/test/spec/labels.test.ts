import { Label, LabelName } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../../src";

describe("labels", () => {
  let hermione: HermioneAllure;

  beforeEach(() => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
  });

  describe("label", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/label.js"], {});
    });

    it("adds `foo` label", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === "foo") as Label;

      expect(label.name).eq("foo");
      expect(label.value).eq("bar");
    });
  });

  describe("epic", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/epic.js"], {});
    });

    it("adds `foo` epic", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.EPIC) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("feature", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/feature.js"], {});
    });

    it("adds `foo` feature", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.FEATURE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("story", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/story.js"], {});
    });

    it("adds `foo` story", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.STORY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("suite", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/suite.js"], {});
    });

    it("adds `foo` suite", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("parentSuite", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/parentSuite.js"], {});
    });

    it("adds `foo` parentSuite", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.PARENT_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("subSuite", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/subSuite.js"], {});
    });

    it("adds `foo` subSuite", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.SUB_SUITE) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("owner", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/owner.js"], {});
    });

    it("adds `foo` owner", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.OWNER) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("severity", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/severity.js"], {});
    });

    it("adds `foo` severity", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.SEVERITY) as Label;

      expect(label.value).eq("foo");
    });
  });

  describe("tag", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/tag.js"], {});
    });

    it("adds `foo` tag", () => {
      const { labels } = hermione.allure.writer.results[0];
      const label = labels.find(({ name }) => name === LabelName.TAG) as Label;

      expect(label.value).eq("foo");
    });
  });
});
