import { it, describe, beforeEach } from "mocha"
import { expect } from "chai"
import Hermione from "hermione"
import { LabelName } from "allure-js-commons"

describe("labels", () => {
  let hermione: Hermione

  beforeEach(() => {
    hermione = new Hermione("./src/test/.hermione.conf.js")
  })

  describe("label", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/label.js"], {})
    })

    it("adds `foo` label", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === "foo")

      expect(label.name).eq("foo")
      expect(label.value).eq("bar")
    })
  })

  describe("epic", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/epic.js"], {})
    })

    it("adds `foo` epic", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.EPIC)

      expect(label.value).eq("foo")
    })
  })

  describe("feature", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/feature.js"], {})
    })

    it("adds `foo` feature", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.FEATURE)

      expect(label.value).eq("foo")
    })
  })

  describe("story", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/story.js"], {})
    })

    it("adds `foo` story", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.STORY)

      expect(label.value).eq("foo")
    })
  })

  describe("suite", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/suite.js"], {})
    })

    it("adds `foo` suite", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.SUITE)

      expect(label.value).eq("foo")
    })
  })

  describe("parentSuite", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/parentSuite.js"], {})
    })

    it("adds `foo` parentSuite", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.PARENT_SUITE)

      expect(label.value).eq("foo")
    })
  })

  describe("subSuite", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/subSuite.js"], {})
    })

    it("adds `foo` subSuite", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.SUB_SUITE)

      expect(label.value).eq("foo")
    })
  })

  describe("owner", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/owner.js"], {})
    })

    it("adds `foo` owner", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.OWNER)

      expect(label.value).eq("foo")
    })
  })

  describe("severity", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/severity.js"], {})
    })

    it("adds `foo` severity", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.SEVERITY)

      expect(label.value).eq("foo")
    })
  })

  describe("tag", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/tag.js"], {})
    })

    it("adds `foo` tag", () => {
      // @ts-ignore
      const { labels } = hermione.allure.writer.results[0]
      const label = labels.find((label: any) => label.name === LabelName.TAG)

      expect(label.value).eq("foo")
    })
  })
})
