import { it, describe, beforeEach } from "mocha"
import { expect } from "chai"
import Hermione from "hermione"
import * as AllureCommons from "allure-js-commons"
import Sinon from "sinon"

describe("attachments", () => {
  let hermione: Hermione
  let writeAttachmentStub: Sinon.SinonStub

  beforeEach(() => {
    Sinon.restore()

    writeAttachmentStub = Sinon.stub(AllureCommons.AllureRuntime.prototype, "writeAttachment")
    hermione = new Hermione("./src/test/.hermione.conf.js")
  })

  describe("attach", () => {
    beforeEach(async () => {
      await hermione.run(["./src/test/fixtures/attachments.js"], {})
    })

    it("adds json attachment", () => {
      // @ts-ignore
      const { attachments: [attachment] } = hermione.allure.writer.results[0]

      expect(attachment.name).eq("Attachment")
      expect(attachment.type).eq("application/json")
      expect(writeAttachmentStub.firstCall.args).eql([JSON.stringify({ foo: "bar" }), "application/json", "utf8"])
    })
  })
})
