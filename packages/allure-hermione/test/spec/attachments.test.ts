import * as AllureCommons from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import Sinon from "sinon";
import { runHermioneTests } from "../runner";

describe("attachments", () => {
  let writeAttachmentStub: Sinon.SinonStub;
  let results: AllureCommons.TestResult[];

  before(async () => {
    Sinon.restore();

    writeAttachmentStub = Sinon.stub(AllureCommons.AllureRuntime.prototype, "writeAttachment");

    results = await runHermioneTests(["./test/fixtures/attachments.js"]);
  });

  it("adds json attachment", () => {
    const {
      attachments: [attachment],
    } = results[0];

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
    expect(writeAttachmentStub.firstCall.args).eql([
      JSON.stringify({ foo: "bar" }),
      "application/json",
      "utf8",
    ]);
  });
});
