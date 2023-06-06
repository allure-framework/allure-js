import * as AllureCommons from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, describe, it } from "mocha";
import Sinon from "sinon";
import { HermioneAllure } from "../types";

describe("attachments", () => {
  let hermione: HermioneAllure;
  let writeAttachmentStub: Sinon.SinonStub;

  before(async () => {
    Sinon.restore();

    writeAttachmentStub = Sinon.stub(AllureCommons.AllureRuntime.prototype, "writeAttachment");
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/attachments.js"], {});
  });

  it("adds json attachment", () => {
    const {
      attachments: [attachment],
    } = hermione.allure.writer.results[0];

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
    expect(writeAttachmentStub.firstCall.args).eql([
      JSON.stringify({ foo: "bar" }),
      "application/json",
      "utf8",
    ]);
  });
});
