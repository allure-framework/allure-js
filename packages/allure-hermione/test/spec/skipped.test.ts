import { Stage, Status, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";
import Hermione from "hermione";

describe("skipped", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/skipped.js"], {});

    results = hermione.allure.writer.results;
  });

  it("handles natively skipped tests", () => {
    const { status, stage } = getTestResultByName(results, "native");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });

  it("handles natively skipped tests inside suites", () => {
    const { status, stage } = getTestResultByName(results, "suite");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });

  it("handles tests skipped by hermione for specific browsers", () => {
    const { status, stage } = getTestResultByName(results, "browser");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });
});
