import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runVitestInlineTest, vitestTestEnvironments } from "../../../utils.js";

describe.each(vitestTestEnvironments)("%s metrics", (_env, createConfig) => {
  it.each([false, true])(
    "writes the beforeAll metric once when the first test is skipped (test plan: %s)",
    async (useTestPlan) => {
      const { metrics = {}, tests } = await runVitestInlineTest(
        {
          "vitest.config.ts": ({ allureResultsPath }) => createConfig(allureResultsPath),
          "sample.test.ts": `
          import { beforeAll, test } from "vitest";
          import { metric } from "allure-js-commons";

          beforeAll(() => metric("bundle.size", 1024));
          test${useTestPlan ? "" : ".skip"}("skipped @allure.id=1", () => {});
          test("runs @allure.id=2", () => {});
        `,
          "testplan.json": JSON.stringify({ version: "1.0", tests: [{ id: 2 }] }),
        },
        useTestPlan ? { env: (testDir) => ({ ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json") }) } : undefined,
      );

      expect(tests).toContainEqual(expect.objectContaining({ name: "runs", status: "passed" }));
      expect(Object.values(metrics).flat()).toEqual([expect.objectContaining({ key: "bundle.size", value: 1024 })]);
    },
  );
});
