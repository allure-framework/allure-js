import { Stage, Status } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, describe, it } from "mocha";
import { HermioneAllure } from "../types";

describe("skipped", () => {
  let hermione: HermioneAllure;

  before(async () => {
    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/skipped.js"], {});
  });

  it("doesn't exclude any skipped test from results", () => {
    expect(hermione.allure.writer.results.length).eq(3);
  });

  it("marks all skipped tests as skipped", () => {
    expect(hermione.allure.writer.results.every(({ status }) => status === Status.SKIPPED)).eq(
      true,
    );
  });

  it("marks all skipped tests as finished", () => {
    expect(hermione.allure.writer.results.every(({ stage }) => stage === Stage.FINISHED)).eq(true);
  });

  it("handles natively skipped test", () => {
    const result = hermione.allure.writer.results.find(
      ({ fullName }) => fullName === "should be skipped",
    )!;

    expect(result.status).eq(Status.SKIPPED);
  });

  it("handles natively skipped test inside a suite", () => {
    const result = hermione.allure.writer.results.find(
      ({ fullName }) => fullName === "with skip should be skipped",
    )!;

    expect(result.status).eq(Status.SKIPPED);
  });

  it("handles skipped test for a specific browser", () => {
    const result = hermione.allure.writer.results.find(
      ({ fullName }) => fullName === "with specific browser skip should be skipped",
    )!;

    expect(result.status).eq(Status.SKIPPED);
  });
});
