import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../../src";

describe("environmentInfo", () => {
  let hermione: HermioneAllure;

  beforeEach(async () => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
    await hermione.run(["./test/fixtures/environmentInfo.js"], {});
  });

  it("adds environment info", () => {
    const { environmentInfo } = hermione.allure.writer;

    expect(environmentInfo).eql({
      foo: "bar",
    });
  });
});
