import { expect } from "chai";
import Hermione from "hermione";
import { describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";

describe("only", () => {
  it("reports only one spec", async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/only.js"], {});

    const results = hermione.allure.writer.results;

    expect(results).length(1);
    expect(results[0].name).eq("third");
  });
});
