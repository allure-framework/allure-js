import { describe, expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../../../utils.js";

describe("labels", () => {
  it("label", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("label", async () => {
        await allure.label("foo", "bar");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("epic", async () => {
        await allure.epic("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("feature", async () => {
        await allure.feature("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("story", async () => {
        await allure.story("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("suite", async () => {
        await allure.suite("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("parentSuite", async () => {
        await allure.parentSuite("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("subSuite", async () => {
        await allure.subSuite("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("owner", async () => {
        await allure.owner("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("severity", async () => {
        await allure.severity("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("layer", async () => {
        await allure.layer("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("allureId", async () => {
        await allure.allureId("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test } from "vitest";

      test("tag", async () => {
        await allure.tag("foo");
      });
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  });
});
