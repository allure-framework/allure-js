import { describe, expect, it } from "@jest/globals";
import { LabelName } from "allure-js-commons";
import { runJestInlineTest } from "../utils";

describe("labels", () => {
  it("label", async () => {
    const { tests } = await runJestInlineTest(`
      it("label", async () => {
        await allure.label("foo", "bar");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: "foo",
        value: "bar",
      }),
    );
  });

  it("allureId", async () => {
    const { tests } = await runJestInlineTest(`
      it("allureId", async () => {
        await allure.id("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.ALLURE_ID,
        value: "foo",
      }),
    );
  });

  it("epic", async () => {
    const { tests } = await runJestInlineTest(`
      it("epic", async () => {
        await allure.epic("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.EPIC,
        value: "foo",
      }),
    );
  });

  it("owner", async () => {
    const { tests } = await runJestInlineTest(`
      it("owner", async () => {
        await allure.owner("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.OWNER,
        value: "foo",
      }),
    );
  });

  it("parentSuite", async () => {
    const { tests } = await runJestInlineTest(`
      it("parentSuite", async () => {
        await allure.parentSuite("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.PARENT_SUITE,
        value: "foo",
      }),
    );
  });

  it("subSuite", async () => {
    const { tests } = await runJestInlineTest(`
      it("subSuite", async () => {
        await allure.subSuite("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.SUB_SUITE,
        value: "foo",
      }),
    );
  });

  it("suite", async () => {
    const { tests } = await runJestInlineTest(`
      it("suite", async () => {
        await allure.suite("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.SUITE,
        value: "foo",
      }),
    );
  });

  it("severity", async () => {
    const { tests } = await runJestInlineTest(`
      it("severity", async () => {
        await allure.severity("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.SEVERITY,
        value: "foo",
      }),
    );
  });

  it("story", async () => {
    const { tests } = await runJestInlineTest(`
      it("story", async () => {
        await allure.story("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.STORY,
        value: "foo",
      }),
    );
  });

  it("tag", async () => {
    const { tests } = await runJestInlineTest(`
      it("tag", async () => {
        await allure.tag("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.TAG,
        value: "foo",
      }),
    );
  });

  it("feature", async () => {
    const { tests } = await runJestInlineTest(`
      it("feature", async () => {
        await allure.feature("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(
      expect.objectContaining({
        name: LabelName.FEATURE,
        value: "foo",
      }),
    );
  });
});
