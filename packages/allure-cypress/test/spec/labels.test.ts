import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("custom", async () => {
  const { tests } = await runCypressInlineTest(`
    import { label } from "allure-cypress";

    it("custom", () => {
      label("foo", "bar");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
});

it("allureId", async () => {
  const { tests } = await runCypressInlineTest(`
    import { allureId } from "allure-cypress";

    it("custom", () => {
      allureId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.ALLURE_ID, value: "foo" }));
});

it("epic", async () => {
  const { tests } = await runCypressInlineTest(`
    import { epic } from "allure-cypress";

    it("custom", () => {
      epic("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.EPIC, value: "foo" }));
});

it("feature", async () => {
  const { tests } = await runCypressInlineTest(`
    import { feature } from "allure-cypress";

    it("custom", () => {
      feature("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.FEATURE, value: "foo" }));
});

it("layer", async () => {
  const { tests } = await runCypressInlineTest(`
    import { layer } from "allure-cypress";

    it("custom", () => {
      layer("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.LAYER, value: "foo" }));
});

it("owner", async () => {
  const { tests } = await runCypressInlineTest(`
    import { owner } from "allure-cypress";

    it("custom", () => {
      owner("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.OWNER, value: "foo" }));
});

it("parentSuite", async () => {
  const { tests } = await runCypressInlineTest(`
    import { parentSuite } from "allure-cypress";

    it("custom", () => {
      parentSuite("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.PARENT_SUITE, value: "foo" }));
});

it("subSuite", async () => {
  const { tests } = await runCypressInlineTest(`
    import { subSuite } from "allure-cypress";

    it("custom", () => {
      subSuite("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SUB_SUITE, value: "foo" }));
});

it("suite", async () => {
  const { tests } = await runCypressInlineTest(`
    import { suite } from "allure-cypress";

    it("custom", () => {
      suite("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SUITE, value: "foo" }));
});

it("severity", async () => {
  const { tests } = await runCypressInlineTest(`
    import { severity } from "allure-cypress";

    it("custom", () => {
      severity("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.SEVERITY, value: "foo" }));
});

it("story", async () => {
  const { tests } = await runCypressInlineTest(`
    import { story } from "allure-cypress";

    it("custom", () => {
      story("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.STORY, value: "foo" }));
});

it("tag", async () => {
  const { tests } = await runCypressInlineTest(`
    import { tag } from "allure-cypress";

    it("custom", () => {
      tag("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.TAG, value: "foo" }));
});
