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

    it.each([
      { name: "muted-only ID", selection: undefined, muted: { id: 2 } },
      {
        name: "muted-only selector",
        selection: undefined,
        muted: { selector: "dummy:foo/sample.test.ts#suite muted" },
      },
      { name: "empty selection", selection: [], muted: { id: 2 } },
      {
        name: "selection and muting",
        selection: [{ id: 2 }, { selector: "dummy:foo/sample.test.ts#suite survivor" }],
        muted: { id: 2 },
      },
    ])("should skip bodies and omit results with $name", async ({ selection, muted }) => {
      const { tests } = await runVitestInlineTest(
        {
          "vitest.config.ts": configFileAccessor,
          "foo/sample.test.ts": `
            import { describe, expect, test } from "vitest";

            let mutedBodyRan = false;
            let unselectedBodyRan = false;

            describe("suite", () => {
              test("muted @allure.id=2", () => {
                mutedBodyRan = true;
              });

              ${selection?.length ? 'test("unselected", () => { unselectedBodyRan = true; });' : ""}

              test("survivor", () => {
                expect(mutedBodyRan).toBe(false);
                expect(unselectedBodyRan).toBe(false);
              });
            });
          `,
          "testplan.json": JSON.stringify({
            version: "1.0",
            ...(selection === undefined ? {} : { tests: selection }),
            mutedTests: [muted],
          }),
        },
        { env: (testDir) => ({ ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json") }) },
      );

      expect(tests).toHaveLength(1);
      expect(tests).toContainEqual(expect.objectContaining({ name: "survivor", status: "passed" }));
    });

    it("should run all tests when both plan collections are empty", async () => {
      const { tests } = await runVitestInlineTest(
        {
          "vitest.config.ts": configFileAccessor,
          "sample.test.ts": `
            import { test } from "vitest";
            test("first", () => {});
            test("second", () => {});
          `,
          "testplan.json": JSON.stringify({ version: "1.0", tests: [], mutedTests: [] }),
        },
        { env: (testDir) => ({ ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json") }) },
      );

      expect(tests).toHaveLength(2);
      expect(tests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "first", status: "passed" }),
          expect.objectContaining({ name: "second", status: "passed" }),
        ]),
      );
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
