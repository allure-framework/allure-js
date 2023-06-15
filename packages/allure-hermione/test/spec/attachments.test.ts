import * as AllureCommons from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import Sinon from "sinon";
import { getHermioneTestResult } from "../runner";

describe("attachments", () => {
  it("adds json attachment", async () => {
    const {
      attachments: [attachment],
    } = getHermioneTestResult("attachments.js")[0];

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
  });
});
