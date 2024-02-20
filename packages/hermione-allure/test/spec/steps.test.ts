import { expect } from "chai";
import { describe, it } from "mocha";
import { Stage, Status } from "allure-js-commons";
import { runHermioneInlineTest } from "../utils";

describe("steps", () => {
  it("reports single passed step", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {});
      });
    `);

    expect(tests).length(1);
    tests.should.contain.something.like({
      status: Status.PASSED,
    });
    expect(tests[0].steps).length(1);
    tests[0].steps.should.contain.something.like({
      name: "foo",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  it("reports multiple sibling steps", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {});
        await allure(ctx).step("bar", async () => {});
        await allure(ctx).step("baz", async () => {});
      });
    `);

    expect(tests).length(1);
    tests.should.contain.something.like({
      status: Status.PASSED,
    });
    expect(tests[0].steps).length(3);
    tests[0].steps.should.contain.something.like({
      name: "foo",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    tests[0].steps.should.contain.something.like({
      name: "bar",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    tests[0].steps.should.contain.something.like({
      name: "baz",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  it("reports nested passed steps", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).step("bar", async () => {
            await allure(ctx).step("baz", async () => {});
          });
        });
      });
    `);

    expect(tests).length(1);
    tests.should.contain.something.like({
      status: Status.PASSED,
    });
    expect(tests[0].steps).length(1);
    tests[0].steps.should.contain.something.like({
      name: "foo",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps).length(1);
    tests[0].steps[0].steps.should.contain.something.like({
      name: "bar",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps[0].steps).length(1);
    tests[0].steps[0].steps[0].steps.should.contain.something.like({
      name: "baz",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  it("reports steps with failed assertion", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).step("bar", async () => {
            await allure(ctx).step("baz", async () => {
              expect(1).toBe(2);
            });
          });
        });
      });
    `);

    expect(tests).length(1);
    tests.should.contain.something.like({
      status: Status.FAILED,
    });
    expect(tests[0].steps).length(1);
    tests[0].steps.should.contain.something.like({
      name: "foo",
      status: Status.FAILED,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps).length(1);
    tests[0].steps[0].steps.should.contain.something.like({
      name: "bar",
      status: Status.FAILED,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps[0].steps).length(1);
    tests[0].steps[0].steps[0].steps.should.contain.something.like({
      name: "baz",
      status: Status.FAILED,
      stage: Stage.FINISHED,
    });
  });

  it("reports steps with unexpected error", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).step("bar", async () => {
            await allure(ctx).step("baz", async () => {
              throw new Error("Unexpected error");
            });
          });
        });
      });
    `);

    expect(tests).length(1);
    tests.should.contain.something.like({
      status: Status.BROKEN,
    });
    expect(tests[0].steps).length(1);
    tests[0].steps.should.contain.something.like({
      name: "foo",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps).length(1);
    tests[0].steps[0].steps.should.contain.something.like({
      name: "bar",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps[0].steps).length(1);
    tests[0].steps[0].steps[0].steps.should.contain.something.like({
      name: "baz",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
    });
  });

  it("adds attachments to current step not test", async () => {
    const { tests, attachments } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).attachment("foo", "text/plain", "attachment name");
        });
      });
    `);

    expect(tests).length(1);
    expect(tests[0].attachments).length(0);
    expect(tests[0].steps).length(1);
    expect(tests[0].steps[0].attachments).length(1);

    const [attachment] = tests[0].steps[0].attachments;

    expect(attachment.name).eq("attachment name");
    expect(attachment.type).eq("text/plain");
    expect(attachments).has.property(attachment.source);
    expect(attachments[attachment.source]).eq("foo");
  });

  it("applies labels, links to test", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).label("foo", "bar");
          await allure(ctx).link("http://example.com", "example");
        });
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({
      name: "foo",
      value: "bar",
    });
    tests[0].links.should.contain.something.like({
      url: "http://example.com",
      name: "example",
    });
  });

  it("applies parameters to step not to test", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("foo", async (ctx) => {
        await allure(ctx).step("foo", async () => {
          await allure(ctx).parameter("foo", "bar");
        });
      });
    `);

    expect(tests).length(1);
    tests[0].parameters.should.not.contain.something.like({
      name: "foo",
      value: "bar",
    });
    expect(tests[0].steps).length(1);
    tests[0].steps[0].parameters.should.contain.something.like({
      name: "foo",
      value: "bar",
    });
  });
});
