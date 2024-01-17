import { LabelName } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

describe("labels", () => {
  it("label", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { label } from "allure-vitest";

      test("label", async (t) => {
        await label(t, "foo", "bar");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { epic } from "allure-vitest";

      test("epic", async (t) => {
        await epic(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { feature } from "allure-vitest";

      test("feature", async (t) => {
        await feature(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { story } from "allure-vitest";

      test("story", async (t) => {
        await story(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { suite } from "allure-vitest";

      test("suite", async (t) => {
        await suite(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { parentSuite } from "allure-vitest";

      test("parentSuite", async (t) => {
        await parentSuite(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { subSuite } from "allure-vitest";

      test("subSuite", async (t) => {
        await subSuite(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { owner } from "allure-vitest";

      test("owner", async (t) => {
        await owner(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { severity } from "allure-vitest";

      test("severity", async (t) => {
        await severity(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { layer } from "allure-vitest";

      test("layer", async (t) => {
        await layer(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { allureId } from "allure-vitest";

      test("id", async (t) => {
        await allureId(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { tag } from "allure-vitest";

      test("tag", async (t) => {
        await tag(t, "foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  });
});
