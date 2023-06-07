import { Stage, Status, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { runHermioneTests } from "../runner";

describe("skipped", () => {
  let results: TestResult[];

  before(async () => {
    results = await runHermioneTests(["./test/fixtures/skipped.js"]);
  });

  it("doesn't exclude any skipped test from results", () => {
    expect(results.length).eq(3);
  });

  it("marks all skipped tests as skipped", () => {
    expect(results.every(({ status }) => status === Status.SKIPPED)).eq(true);
  });

  it("marks all skipped tests as finished", () => {
    expect(results.every(({ stage }) => stage === Stage.FINISHED)).eq(true);
  });

  it("handles natively skipped test", () => {
    const result = results.find(({ fullName }) => fullName === "should be skipped")!;

    expect(result.status).eq(Status.SKIPPED);
  });

  it("handles natively skipped test inside a suite", () => {
    const result = results.find(({ fullName }) => fullName === "with skip should be skipped")!;

    expect(result.status).eq(Status.SKIPPED);
  });

  it("handles skipped test for a specific browser", () => {
    const result = results.find(
      ({ fullName }) => fullName === "with specific browser skip should be skipped",
    )!;

    expect(result.status).eq(Status.SKIPPED);
  });
});
