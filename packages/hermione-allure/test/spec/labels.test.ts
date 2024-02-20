import { expect } from "chai";
import { LabelName } from "allure-js-commons";
import { runHermioneInlineTest } from "../utils";

describe("labels", () => {
  it("adds `foo` custom label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("custom", async (ctx) => {
        await allure(ctx).label("foo", "bar");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: "foo", value: "bar" });
  });

  it("adds `42` allureId label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("allureId", async (ctx) => {
        await allure(ctx).id("42");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.ALLURE_ID, value: "42" });
  });

  it("adds `foo` epic label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("epic", async (ctx) => {
        await allure(ctx).epic("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.EPIC, value: "foo" });
  });

  it("adds `foo` feature label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("feature", async (ctx) => {
        await allure(ctx).feature("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.FEATURE, value: "foo" });
  });

  it("adds `foo` story label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("story", async (ctx) => {
        await allure(ctx).story("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.STORY, value: "foo" });
  });

  it("adds `foo` suite label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("suite", async (ctx) => {
        await allure(ctx).suite("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.SUITE, value: "foo" });
  });

  it("adds `foo` parentSuite label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("parentSuite", async (ctx) => {
        await allure(ctx).parentSuite("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("adds `foo` subSuite label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("subSuite", async (ctx) => {
        await allure(ctx).subSuite("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("adds `foo` owner label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("owner", async (ctx) => {
        await allure(ctx).owner("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.OWNER, value: "foo" });
  });

  it("adds `foo` severity label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("severity", async (ctx) => {
        await allure(ctx).severity("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("adds `foo` tag label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("tag", async (ctx) => {
        await allure(ctx).tag("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.TAG, value: "foo" });
  });

  it("adds `foo` layer label", async () => {
    const { tests } = await runHermioneInlineTest(`
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("layer", async (ctx) => {
        await allure(ctx).layer("foo");
      });
    `);

    expect(tests).length(1);
    tests[0].labels.should.contain.something.like({ name: LabelName.LAYER, value: "foo" });
  });
});
