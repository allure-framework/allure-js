import { LabelName } from "allure-js-commons";
import { describe, expect, it, vitest } from "vitest";
import { getTestResult } from "../utils.js";

describe("labels", () => {
  it("label", async () => {
    const result = await getTestResult("label");

    expect(result.labels).toContainEqual({ name: "foo", value: "bar" });
  });

  it("epic", async () => {
    const result = await getTestResult("epic");

    expect(result.labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  });

  it("feature", async () => {
    const result = await getTestResult("feature");

    expect(result.labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  });

  it("story", async () => {
    const result = await getTestResult("story");

    expect(result.labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  });

  it("suite", async () => {
    const result = await getTestResult("suite");

    expect(result.labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  });

  it("parentSuite", async () => {
    const result = await getTestResult("parentSuite");

    expect(result.labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  });

  it("subSuite", async () => {
    const result = await getTestResult("subSuite");

    expect(result.labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  });

  it("owner", async () => {
    const result = await getTestResult("owner");

    expect(result.labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  });

  it("severity", async () => {
    const result = await getTestResult("severity");

    expect(result.labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  });

  it("layer", async () => {
    const result = await getTestResult("layer");

    expect(result.labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  });

  it("id", async () => {
    const result = await getTestResult("id");

    expect(result.labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  });

  it("tag", async () => {
    const result = await getTestResult("tag");

    expect(result.labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
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
