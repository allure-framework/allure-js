import { TestResult } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";

describe("displayName", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/displayName.js"], {});

    results = hermione.allure.writer.results;
  });

  it("sets custom test name", () => {
    const { name, fullName } = getTestResultByName(results, "foo");

    expect(name).eq("foo");
    expect(fullName).eq("display name");
  });
});
