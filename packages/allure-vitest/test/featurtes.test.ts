import { describe, expect } from "vitest";
import { allureTest } from "../src/test.js";

allureTest("labels", ({ allure }) => {
  allure.label("demo", "works");
  expect(1 + 1).toBe(2);
});

describe("steps & attachments", () => {
  allureTest("simple steps", async ({ allure }) => {
    await allure.step("step 1", async () => {});
    await allure.step("step 2", async () => {});
  });

  allureTest("simple attachments", ({ allure }) => {
    allure.attachment("text", "some-text", "text/plain");
    allure.attachment("json", "{foo: true}", "application/json");
  });

  allureTest("nested steps with attachments", async ({ allure }) => {
    allure.attachment("text", "level-1", "text/plain");

    await allure.step("step 1", async () => {
      allure.attachment("text", "level-2", "text/plain");

      await allure.step("step 1-1", async () => {
        allure.attachment("text", "level-3", "text/plain");
      });
    });

    await allure.step("step 2", async () => {});
  });
});
