import { it, describe, beforeEach } from "mocha"
import { expect } from "chai"
import Hermione from "hermione"
import { LinkType } from "allure-js-commons"

describe("links", () => {
  let hermione: Hermione

  beforeEach(() => {
    hermione = new Hermione("./src/test/.hermione.conf.js")
  })

  describe("link", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/link.js"], {})
    })

    it("adds `foo` label", () => {
      // @ts-ignore
      const { links } = hermione.allure.writer.results[0]
      const link = links.find((link: any) => link.type === "foo")

      expect(link.name).eq("bar")
      expect(link.url).eq("http://example.org")
    })
  })

  describe("tms", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/tms.js"], {})
    })

    it("adds `foo` tms link", () => {
      // @ts-ignore
      const { links } = hermione.allure.writer.results[0]
      const link = links.find((link: any) => link.type === LinkType.TMS)

      expect(link.name).eq("foo")
      expect(link.url).eq("http://example.org")
    })
  })

  describe("issue", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/issue.js"], {})
    })

    it("adds `foo` issue link", () => {
      // @ts-ignore
      const { links } = hermione.allure.writer.results[0]
      const link = links.find((link: any) => link.type === LinkType.ISSUE)

      expect(link.name).eq("foo")
      expect(link.url).eq("http://example.org")
    })
  })
})
