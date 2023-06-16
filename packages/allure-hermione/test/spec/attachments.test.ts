import * as AllureCommons from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";
import Hermione from "hermione";

describe("attachments", () => {
  it("adds json attachment", async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/attachments.js"], {});

    const { results } = hermione.allure.writer;
    const {
      attachments: [attachment],
    } = getTestResultByName(results, "json");

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
  });
});
