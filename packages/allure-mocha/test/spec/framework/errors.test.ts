import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("test error", () => {
  const testMap = new Map<string | undefined, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(["plain-mocha", "ansiError"]);
    for (const test of tests) {
      testMap.set(test.name as string, test);
    }
  });

  it("should strip ansi characters in message & trace", () => {
    expect(testMap.get("a test with ansi chars in error")).toMatchObject({
      statusDetails: expect.objectContaining({
        message: `expect(received).toEqual(expected) // deep equality

Expected: 5
Received: 4`,
        trace: expect.stringContaining(`expect(received).toEqual(expected) // deep equality

Expected: 5
Received: 4`),
      }),
    });
  });
});
