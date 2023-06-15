import { Stage, Status, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { getHermioneTestResult } from "../runner";

describe("skipped", () => {
  it("doesn't exclude any skipped test from results and mark them as skipped", async () => {
    const results = getHermioneTestResult("skipped.js");
    const singleTest = results.find(({ fullName }) => fullName === "should be skipped")!;
    const testInSuite = results.find(({ fullName }) => fullName === "with skip should be skipped")!;
    const testForSpecificBrowser = results.find(
      ({ fullName }) => fullName === "with specific browser skip should be skipped",
    )!;

    expect(results.length).eq(3);
    expect(results.every(({ status }) => status === Status.SKIPPED)).eq(true);
    expect(results.every(({ stage }) => stage === Stage.FINISHED)).eq(true);
    expect(singleTest.status).eq(Status.SKIPPED);
    expect(testInSuite.status).eq(Status.SKIPPED);
    expect(testForSpecificBrowser.status).eq(Status.SKIPPED);
  });
});
