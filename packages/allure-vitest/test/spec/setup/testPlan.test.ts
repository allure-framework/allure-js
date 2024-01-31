import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("supports test plan", async () => {
  const { tests } = await runVitestInlineTest(
    `
      import { test } from "vitest";

      test("foo", () => {});

      test("bar", () => {});
    `,
    undefined,
    async (testDir) => {
      const testPlanPath = join(testDir, "testplan.json");

      await writeFile(
        testPlanPath,
        JSON.stringify({
          tests: [
            {
              selector: "sample.test.ts#foo",
            },
          ],
        }),
      );

      process.env.ALLURE_TESTPLAN_PATH = testPlanPath;
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
