import * as AllureCommons from "allure-js-commons";
import { expect } from "chai";
import Sinon from "sinon";
import { beforeEach, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { runHermione } from "../helper/run_helper";

describe("attachments", () => {
  let writeAttachmentStub: Sinon.SinonStub;

  beforeEach(() => {
    Sinon.restore();

    writeAttachmentStub = Sinon.stub(AllureCommons.AllureRuntime.prototype, "writeAttachment");
  });

  it("adds json attachment", async () => {
    const allureResults = await runHermione(["./test/fixtures/attachments.js"]);

    const { tests: results } = allureResults;
    const {
      attachments: [attachment],
    } = getTestResultByName(results, "json");

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
    expect(writeAttachmentStub.firstCall.args).eql([
      JSON.stringify({ foo: "bar" }),
      "application/json",
      "utf8",
    ]);
  });
});
