import { join } from "node:path";
import { expect, it } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runJestInlineTest } from "../utils.js";

it("respects testplan", async () => {
  const exampleTestPlan: TestPlanV1 = {
    version: "1.0",
    tests: [
      {
        id: 1,
        selector: "nested/super strange nested/super strange name.test.js#also nested should execute",
      },
      {
        id: 2,
        selector: "b.test.js#should execute",
      },
      {
        id: 3,
        selector: ".+.test.js#+.",
      },
      {
        id: 4,
        selector: "notaga.test.js#a",
      },
    ],
  };
  const testPlanFilename = "example-testplan.json";
  const { tests } = await runJestInlineTest(
    {
      [testPlanFilename]: JSON.stringify(exampleTestPlan),
      "a.test.js": `
        it('should not execute', () => {});
        `,
      "b.test.js": `
        it('should execute', () => {});
        `,
      "nested/super strange nested/super strange name.test.js": `
        describe('also nested', () => {
          it('should execute', () => {});
        });
        `,
      ".+.test.js": `
         it('+.', () => {});
       `,
      "aga.test.js": `
         it('a', () => {});

         it('aa', () => {});

         it('selected name @allure.id=5', () => {});
       `,
      "notaga.test.js": `
         it('a', () => {});
       `,
    },
    (testDir) => ({
      ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
    }),
    ["--runInBand"],
  );

  expect(tests).toHaveLength(4);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should execute",
        fullName: "b.test.js#should execute",
      }),
      expect.objectContaining({
        name: "should execute",
        fullName: "nested/super strange nested/super strange name.test.js#also nested should execute",
      }),
      expect.objectContaining({
        name: "+.",
        fullName: ".+.test.js#+.",
      }),
      expect.objectContaining({
        name: "a",
        fullName: "notaga.test.js#a",
      }),
    ]),
  );
});
