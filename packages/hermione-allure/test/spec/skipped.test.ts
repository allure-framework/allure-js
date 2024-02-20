import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermioneInlineTest } from "../utils";
import {Stage, Status} from "allure-js-commons";

describe("skipped", () => {
  it("doesn't report skipped tests", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      it.skip("native", () => {});
    `);

    expect(tests).length(0);
  });

  it("doesn't report skipped suites", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      describe.skip("native", () => {
        it("is skipped", () => {});
      });
    `);

    expect(tests).length(0);
  });

  it("reports programatically skipped tests for specific browsers", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      describe("skipped", () => {
        hermione.skip.in("headless");
        it("browser", () => {});
      });
    `);

    expect(tests).length(1);
    expect(tests[0].stage).eq(Stage.PENDING)
    expect(tests[0].status).eq(Status.SKIPPED)
  });
});
