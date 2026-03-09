import { test, expect, describe } from "bun:test";
import { step, attachment, severity, epic, feature, ContentType } from "allure-js-commons";

describe("Allure Bun Integration", () => {
  test("basic test", () => {
    expect(1 + 1).toBe(2);
  });

  test("test with steps", async () => {
    await step("Step 1: Initialize", async () => {
      const data = { value: 42 };
      expect(data.value).toBe(42);
    });

    await step("Step 2: Process", async () => {
      const result = 10 * 5;
      expect(result).toBe(50);
    });

    await step("Step 3: Verify", async () => {
      expect(true).toBe(true);
    });
  });

  test("test with attachments @severity:critical", async () => {
    await attachment("Test data", JSON.stringify({ test: "data" }), {
      contentType: ContentType.JSON,
    });

    await attachment("Log output", "Test execution log", {
      contentType: ContentType.TEXT,
    });

    expect(true).toBe(true);
  });

  test("test with metadata @epic:Testing @feature:Allure @severity:normal", () => {
    expect("allure").toContain("all");
  });

  test("programmatic metadata", async () => {
    const allure = (globalThis as any).allure;

    if (allure) {
      allure.epic("Bun Integration");
      allure.feature("Reporter");
      allure.story("Generate Report");
      allure.owner("Test Team");
      allure.tag("integration");
      allure.link("https://bun.sh", "Bun Website");
    }

    await step("Execute test logic", async () => {
      expect(2 + 2).toBe(4);
    });
  });

  test.skip("skipped test", () => {
    expect(false).toBe(true);
  });

  test.todo("todo test");
});
