import { TestResult } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";

describe("description", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/description.js"], {});

    results = hermione.allure.writer.results;
  });

  it("adds `foo` markdown description", () => {
    const { description } = getTestResultByName(results, "markdown description");

    expect(description).eq("foo");
  });

  it("adds `foo` html description", () => {
    const { descriptionHtml } = getTestResultByName(results, "html description");

    expect(descriptionHtml).eq("foo");
  });
});
