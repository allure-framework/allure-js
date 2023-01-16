import { Parameter } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../../src";

describe("parameters", () => {
  let hermione: HermioneAllure;

  beforeEach(() => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
  });

  describe("parameter", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/parameter.js"], {});
    });

    it("adds `foo` parameter", () => {
      const { parameters } = hermione.allure.writer.results[0];
      const parameter = parameters.find(({ name }) => name === "foo") as Parameter;

      expect(parameter.name).eq("foo");
      expect(parameter.value).eq("bar");
      expect(parameter.excluded).eq(false);
      expect(parameter.hidden).eq(true);
    });
  });
});
