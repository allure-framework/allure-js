import { expect } from "chai";
import { describe, it } from "mocha";
import { Stage, Status } from "allure-js-commons";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("skipped", () => {
  it("handles natively skipped tests", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/skipped.js"]);

    const { status, stage } = getTestResultByName(results, "native");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });

  it("handles natively skipped tests inside suites", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/skipped.js"]);

    const { status, stage } = getTestResultByName(results, "suite");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });

  it("handles tests skipped by hermione for specific browsers", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/skipped.js"]);

    const { status, stage } = getTestResultByName(results, "browser");

    expect(status).eq(Status.SKIPPED);
    expect(stage).eq(Stage.FINISHED);
  });
});
