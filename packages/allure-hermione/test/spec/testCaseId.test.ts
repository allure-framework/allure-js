import { TestResult } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";

describe("testCaseId", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/testCaseId.js"], {});

    results = hermione.allure.writer.results;
  });

  it("sets custom test case id", () => {
    const { testCaseId } = getTestResultByName(results, "testCaseId");

    expect(testCaseId).eq("foo");
  });
});
