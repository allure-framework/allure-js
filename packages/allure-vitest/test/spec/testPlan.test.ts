import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

describe("test plan", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("does not apply the outer run's test plan to inline fixtures", async () => {
      const dir = await mkdtemp(join(tmpdir(), "allure-vitest-outer-plan-"));
      const planPath = join(dir, "testplan.json");
      await writeFile(planPath, JSON.stringify({ version: "1.0", tests: [{ selector: "outer:test.ts#selected" }] }));
      vi.stubEnv("ALLURE_TESTPLAN_PATH", planPath);
      try {
        const { tests } = await runVitestInlineTest({
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `import { test } from 'vitest'; test('inner', () => {});`,
        });
        expect(tests).toHaveLength(1);
        expect(tests[0]).toMatchObject({ name: "inner", status: "passed" });
      } finally {
        vi.unstubAllEnvs();
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("should support test plan", async () => {
      const { tests } = await runVitestInlineTest(
        {
          "vitest.config.ts": configFileAccessor,
          "foo/sample.test.ts": `
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

          export const testFixture = test.extend({
          dummy: async ({}, use) => {
            await use("fixture data");
          },
          });

          testFixture("fixture test", async ({ dummy }) => {
            await logStep(dummy);
          });
        `,
          "testplan.json": JSON.stringify(
            {
              version: "1.0",
              tests: [
                { selector: "dummy:foo/sample.test.ts#baz" },
                { id: 3 },
                { selector: "dummy:foo/sample.test.ts#foo bar boop" },
              ],
            },
            null,
            2,
          ),
        },
        {
          env: (testDir) => ({
            ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json"),
          }),
        },
      );

      expect(tests).toHaveLength(3);
      expect(tests).toContainEqual(expect.objectContaining({ name: "baz", fullName: "dummy:foo/sample.test.ts#baz" }));
      expect(tests).toContainEqual(
        expect.objectContaining({ name: "beep", fullName: "dummy:foo/sample.test.ts#beep" }),
      );
      expect(tests).toContainEqual(
        expect.objectContaining({ name: "boop", fullName: "dummy:foo/sample.test.ts#foo bar boop" }),
      );
    });
  });
});
