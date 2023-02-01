import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../../src";

describe("categories", () => {
  let hermione: HermioneAllure;

  beforeEach(() => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
  });

  describe("category", () => {
    beforeEach(async () => {
      await hermione.run(["./test/fixtures/categories.js"], {});
    });

    it("adds categories", () => {
      const { categories } = hermione.allure.writer;

      expect(categories!.length).eq(2);
      expect(categories!.find(({ name }) => name === "foo")).eql({
        name: "foo",
        matchedStatuses: ["failed"],
        messageRegex: "^message_reg$",
      });
      expect(categories!.find(({ name }) => name === "bar")).eql({
        name: "bar",
        matchedStatuses: ["passed"],
        traceRegex: "^trace_reg$",
      });
    });
  });
});
