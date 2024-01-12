import { LabelName } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("labels", () => {
  it("label", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("label", ({ allure }) => {
        allure.label("foo", "bar");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("epic", ({ allure }) => {
        allure.epic("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("feature", ({ allure }) => {
        allure.feature("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("story", ({ allure }) => {
        allure.story("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("suite", ({ allure }) => {
        allure.suite("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("parentSuite", ({ allure }) => {
        allure.parentSuite("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("subSuite", ({ allure }) => {
        allure.subSuite("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("owner", ({ allure }) => {
        allure.owner("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("severity", ({ allure }) => {
        allure.severity("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("layer", ({ allure }) => {
        allure.layer("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("id", ({ allure }) => {
        allure.id("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("tag", ({ allure }) => {
        allure.tag("foo");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
  });
});

// describe("steps & attachments", () => {
//   allureTest("simple steps", async ({ allure }) => {
//     await allure.step("step 1", async () => {});
//     await allure.step("step 2", async () => {});
//   });

//   allureTest("simple attachments", ({ allure }) => {
//     allure.attachment("text", "some-text", "text/plain");
//     allure.attachment("json", "{foo: true}", "application/json");
//   });

//   allureTest("nested steps with attachments", async ({ allure }) => {
//     allure.attachment("text", "level-1", "text/plain");

//     await allure.step("step 1", async () => {
//       allure.attachment("text", "level-2", "text/plain");

//       await allure.step("step 1-1", async () => {
//         allure.attachment("text", "level-3", "text/plain");
//       });
//     });

//     await allure.step("step 2", async () => {});
//   });
// });
