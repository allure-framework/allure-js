import { describe, expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../utils.js";

describe("labels", () => {
  it("label", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { label } from "allure-js-commons/";

      test("label", async () => {
        await label("foo", "bar");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { epic } from "allure-js-commons/";

      test("epic", async () => {
        await epic("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { feature } from "allure-js-commons/";

      test("feature", async () => {
        await feature("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { story } from "allure-js-commons/";

      test("story", async () => {
        await story("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { suite } from "allure-js-commons/";

      test("suite", async () => {
        await suite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { parentSuite } from "allure-js-commons/";

      test("parentSuite", async () => {
        await parentSuite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { subSuite } from "allure-js-commons/";

      test("subSuite", async () => {
        await subSuite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { owner } from "allure-js-commons/";

      test("owner", async () => {
        await owner("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { severity } from "allure-js-commons/";

      test("severity", async () => {
        await severity("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { layer } from "allure-js-commons/";

      test("layer", async () => {
        await layer("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { allureId } from "allure-js-commons/";

      test("allureId", async () => {
        await allureId("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { tag } from "allure-js-commons/";

      test("tag", async () => {
        await tag("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  });
});
