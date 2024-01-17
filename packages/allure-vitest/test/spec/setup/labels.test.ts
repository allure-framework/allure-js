import { LabelName } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

describe("labels", () => {
  it("label", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("label", () => {
        this.allure.label("foo", "bar");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("epic", () => {
        this.allure.epic("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("feature", () => {
        this.allure.feature("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("story", () => {
        this.allure.story("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("suite", () => {
        this.allure.suite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("parentSuite", () => {
        this.allure.parentSuite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("subSuite", () => {
        this.allure.subSuite("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("owner", () => {
        this.allure.owner("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("severity", () => {
        this.allure.severity("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("layer", () => {
        this.allure.layer("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("allureId", () => {
        this.allure.allureId("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("tag", () => {
        this.allure.tag("foo");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  });
});
