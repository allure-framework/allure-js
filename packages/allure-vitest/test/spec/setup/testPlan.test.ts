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

      test("baz @allure.id=2", () => {});
    `,
    undefined,
    async (testDir) => {
      const testPlanPath = join(testDir, "testplan.json");

      await writeFile(
        testPlanPath,
        JSON.stringify({
          tests: [
            {
              id: 1,
              selector: "sample.test.ts#foo",
            },
            {
              id: 2,
              selector: "sample.test.ts#baz @allure.id=2",
            },
          ],
        }),
      );

      process.env.ALLURE_TESTPLAN_PATH = testPlanPath;
    },
  );

  expect(tests).toHaveLength(2);
  expect(tests).toContainEqual(expect.objectContaining({ name: "foo", fullName: "sample.test.ts#foo" }));
  expect(tests).toContainEqual(expect.objectContaining({ name: "baz", fullName: "sample.test.ts#baz @allure.id=2" }));
});
