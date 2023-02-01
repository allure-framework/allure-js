import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import Sinon from "sinon";
import { HermioneAllure } from "../../src";

describe("attachments", () => {
  let hermione: HermioneAllure;

  beforeEach(async () => {
    Sinon.restore();

    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/attachments.js"], {});
  });

  it("adds json attachment", () => {
    const {
      attachments: [attachment],
    } = hermione.allure.writer.results[0];

    expect(attachment.name).eq("Attachment");
    expect(attachment.type).eq("application/json");
    expect(attachment.source).contains(".json");
  });
});
