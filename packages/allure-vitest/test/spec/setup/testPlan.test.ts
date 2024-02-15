import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("supports test plan", async () => {
  const { tests } = await runVitestInlineTest(
    `
      import { test, describe } from "vitest";

      test("foo", () => {});

      test("bar", () => {});

      test("baz @allure.id=2", () => {});

      test("beep @allure.id=3", () => {});

      describe("foo", () => {
        describe("bar", () => {
          test("boop", () => {});
        });
      });
    `,
    undefined,
    async (testDir) => {
      const testPlanPath = join(testDir, "testplan.json");

      await writeFile(
        testPlanPath,
        JSON.stringify({
          tests: [
            {
              selector: "sample.test.ts#baz @allure.id=2",
            },
            {
              id: 3,
            },
            {
              selector: "sample.test.ts#foo bar boop",
            },
          ],
        }),
      );

      process.env.ALLURE_TESTPLAN_PATH = testPlanPath;
    },
  );

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(expect.objectContaining({ name: "baz", fullName: "sample.test.ts#baz @allure.id=2" }));
  expect(tests).toContainEqual(expect.objectContaining({ name: "beep", fullName: "sample.test.ts#beep @allure.id=3" }));
  expect(tests).toContainEqual(expect.objectContaining({ name: "boop", fullName: "sample.test.ts#foo bar boop" }));
});
