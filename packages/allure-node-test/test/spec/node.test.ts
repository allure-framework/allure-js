import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { LabelName, Stage, Status } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { runNodeInlineTest, supportsNodeTestRuntimeApi } from "../utils.js";
import { getTestByName, readAttachment } from "./helpers.js";

describe("node --test integration", () => {
  it("writes reporter-only results with unchanged node:test imports", async () => {
    const { exitCode, tests } = await runNodeInlineTest({
      "sample.test.mjs": `
        import { describe, it } from "node:test";
        import assert from "node:assert/strict";

        describe("Native suite", () => {
          it("passes", () => {
            assert.equal(1 + 1, 2);
          });

          it("skips", { skip: "later" }, () => {
            assert.equal(1, 2);
          });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(2);

    const passed = getTestByName(tests, "passes");

    expect(passed).toEqual(
      expect.objectContaining({
        fullName: expect.stringMatching(
          /^allure-node-test:test\/fixtures\/[^/]+\/sample\.test\.mjs#Native suite passes$/,
        ),
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    );
    expect(passed.labels).toEqual(
      expect.arrayContaining([
        { name: "framework", value: "node:test" },
        { name: LabelName.PARENT_SUITE, value: "Native suite" },
      ]),
    );
    expect(getTestByName(tests, "skips")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
        statusDetails: { message: "later" },
      }),
    );
  });

  it("writes configured environment info, categories and global labels", async () => {
    const { categories, envInfo, exitCode, tests } = await runNodeInlineTest(
      {
        "configured.test.mjs": `
          import test from "node:test";

          test("configured", () => {});
        `,
      },
      {
        env: () => ({
          ALLURE_NODE_TEST_CONFIG: JSON.stringify({
            categories: [{ name: "known", messageRegex: "known problem" }],
            environmentInfo: { runtime: "node" },
            globalLabels: { layer: "api" },
          }),
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(envInfo).toEqual({ runtime: "node" });
    expect(categories).toEqual([expect.objectContaining({ name: "known", messageRegex: "known problem" })]);
    expect(getTestByName(tests, "configured").labels).toEqual(
      expect.arrayContaining([{ name: LabelName.LAYER, value: "api" }]),
    );
  });

  it("preserves failed native hooks as fixtures without synthetic tests", async () => {
    const { exitCode, globals, groups, tests } = await runNodeInlineTest({
      "hooks.test.mjs": `
        import { describe, it, before, beforeEach, afterEach, after } from "node:test";
        import assert from "node:assert/strict";

        describe("before suite", () => {
          before(() => {
            throw new Error("suite before failed");
          });

          it("cancelled by before", () => {});
        });

        describe("beforeEach suite", () => {
          beforeEach(() => {
            assert.fail("beforeEach assertion");
          });

          it("fails in beforeEach", () => {});
        });

        describe("afterEach suite", () => {
          afterEach(() => {
            throw new Error("afterEach failed");
          });

          it("fails in afterEach", () => {});
        });

        describe("after suite", () => {
          after(() => {
            throw new Error("suite after failed");
          });

          it("body passes", () => {
            assert.equal(1, 1);
          });
        });
      `,
    });

    expect(exitCode).not.toBe(0);
    expect(tests).toHaveLength(4);
    expect(tests.map((test) => test.name).sort()).toEqual([
      "body passes",
      "cancelled by before",
      "fails in afterEach",
      "fails in beforeEach",
    ]);

    const cancelled = getTestByName(tests, "cancelled by before");
    const beforeEach = getTestByName(tests, "fails in beforeEach");
    const afterEach = getTestByName(tests, "fails in afterEach");
    const after = getTestByName(tests, "body passes");

    expect(cancelled).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
        statusDetails: expect.objectContaining({
          message: "skipped because before hook failed: suite before failed",
        }),
      }),
    );
    expect(beforeEach).toEqual(
      expect.objectContaining({
        status: Status.FAILED,
        statusDetails: expect.objectContaining({
          message: "beforeEach assertion",
        }),
      }),
    );
    expect(afterEach).toEqual(
      expect.objectContaining({
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: "afterEach failed",
        }),
      }),
    );
    expect(after).toEqual(
      expect.objectContaining({
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: "suite after failed",
        }),
      }),
    );

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [cancelled.uuid],
          befores: [expect.objectContaining({ name: "before hook", status: Status.BROKEN })],
          afters: [],
        }),
        expect.objectContaining({
          children: [beforeEach.uuid],
          befores: [expect.objectContaining({ name: "beforeEach hook", status: Status.FAILED })],
          afters: [],
        }),
        expect.objectContaining({
          children: [afterEach.uuid],
          befores: [],
          afters: [expect.objectContaining({ name: "afterEach hook", status: Status.BROKEN })],
        }),
        expect.objectContaining({
          children: [after.uuid],
          befores: [],
          afters: [expect.objectContaining({ name: "after hook", status: Status.BROKEN })],
        }),
      ]),
    );
    expect(Object.values(globals ?? {}).flatMap((entry) => entry.errors)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "before hook in before suite failed: suite before failed" }),
        expect.objectContaining({ message: "beforeEach hook in beforeEach suite failed: beforeEach assertion" }),
        expect.objectContaining({ message: "afterEach hook in afterEach suite failed: afterEach failed" }),
        expect.objectContaining({ message: "after hook in after suite failed: suite after failed" }),
      ]),
    );
  });

  // The setup failure is only meaningful before node:test exposes getTestContext;
  // keep the unsupported-runtime case visible on Node versions where it cannot fail.
  it.skipIf(supportsNodeTestRuntimeApi)(
    "fails fast when setup is used on a Node version without getTestContext",
    async () => {
      const { exitCode } = await runNodeInlineTest(
        {
          "unsupported-runtime.test.mjs": `
            import test from "node:test";

            test("never runs", () => {});
          `,
        },
        { setup: true },
      );

      expect(exitCode).not.toBe(0);
    },
  );

  it("does not execute tests outside ALLURE_TESTPLAN_PATH when setup is preloaded", async () => {
    const executionDir = mkdtempSync(join(tmpdir(), "allure-node-testplan-execution-"));
    const executionLog = join(executionDir, "execution.log");

    try {
      const { exitCode, tests } = await runNodeInlineTest(
        {
          "testplan-esm.test.mjs": `
            import { appendFileSync } from "node:fs";
            import test, { it } from "node:test";

            test("selected default @allure.id:100", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran selected default\\n");
            });

            test("omitted default @allure.id:200", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran omitted default\\n");
            });

            it("selected named @allure.id:101", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran selected named\\n");
            });

            it("omitted named @allure.id:201", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran omitted named\\n");
            });
          `,
          "testplan-cjs.test.cjs": `
            const { appendFileSync } = require("node:fs");
            const test = require("node:test");

            test("selected cjs @allure.id:102", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran selected cjs\\n");
            });

            test("omitted cjs @allure.id:202", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran omitted cjs\\n");
            });
          `,
        },
        {
          env: (testDir) => {
            const testPlanPath = join(testDir, "testplan.json");

            writeFileSync(
              testPlanPath,
              JSON.stringify({
                version: "1.0",
                tests: [{ id: "100" }, { id: "101" }, { id: "102" }],
              }),
              "utf8",
            );

            return { ALLURE_TESTPLAN_PATH: testPlanPath, EXECUTION_LOG: executionLog };
          },
          setup: true,
        },
      );
      const output = readFileSync(executionLog, "utf8");

      expect(exitCode).toBe(0);
      expect(tests.map((test) => test.name).sort()).toEqual(["selected cjs", "selected default", "selected named"]);
      expect(output).toContain("ran selected default");
      expect(output).toContain("ran selected named");
      expect(output).toContain("ran selected cjs");
      expect(output).not.toContain("ran omitted default");
      expect(output).not.toContain("ran omitted named");
      expect(output).not.toContain("ran omitted cjs");
    } finally {
      rmSync(executionDir, { force: true, recursive: true });
    }
  });

  it("expands selected subtest selectors to the parent execution boundary", async () => {
    const executionDir = mkdtempSync(join(tmpdir(), "allure-node-subtest-plan-execution-"));
    const executionLog = join(executionDir, "execution.log");

    try {
      const { exitCode, tests } = await runNodeInlineTest(
        {
          "subtest-plan.test.mjs": `
            import { appendFileSync } from "node:fs";
            import test from "node:test";

            test("parent flow", async (t) => {
              appendFileSync(process.env.EXECUTION_LOG, "ran parent\\n");

              await t.test("first child", () => {
                appendFileSync(process.env.EXECUTION_LOG, "ran first child\\n");
              });

              await t.test("second child", () => {
                appendFileSync(process.env.EXECUTION_LOG, "ran second child\\n");
              });
            });

            test("unrelated top-level", () => {
              appendFileSync(process.env.EXECUTION_LOG, "ran unrelated\\n");
            });
          `,
        },
        {
          env: (testDir) => {
            const testPlanPath = join(testDir, "testplan.json");
            const selector = `allure-node-test:test/fixtures/${basename(testDir)}/subtest-plan.test.mjs#parent flow second child`;

            writeFileSync(
              testPlanPath,
              JSON.stringify({
                version: "1.0",
                tests: [{ selector }],
              }),
              "utf8",
            );

            return { ALLURE_TESTPLAN_PATH: testPlanPath, EXECUTION_LOG: executionLog };
          },
          setup: true,
        },
      );
      const output = readFileSync(executionLog, "utf8");

      expect(exitCode).toBe(0);
      expect(tests.map((test) => test.name).sort()).toEqual(["first child", "parent flow", "second child"]);
      expect(output).toContain("ran parent");
      expect(output).toContain("ran first child");
      expect(output).toContain("ran second child");
      expect(output).not.toContain("ran unrelated");
    } finally {
      rmSync(executionDir, { force: true, recursive: true });
    }
  });

  // Runtime API calls require node:test getTestContext, which is available in Node >= 26.1.
  it.skipIf(!supportsNodeTestRuntimeApi)(
    "writes runtime API data with unchanged node:test imports on Node >= 26.1",
    async () => {
      const { attachments, exitCode, tests } = await runNodeInlineTest(
        {
          "runtime.test.mjs": `
          import test from "node:test";
          import assert from "node:assert/strict";
          import { attachment, label, step } from "allure-js-commons";

          test("uses runtime API", async () => {
            await label("feature", "native-runtime");
            await step("runtime step", async () => {
              await attachment("runtime attachment", "hello node", "text/plain");
            });
            assert.equal(1 + 1, 2);
          });
        `,
        },
        { setup: true },
      );

      expect(exitCode).toBe(0);

      const result = getTestByName(tests, "uses runtime API");

      expect(result.labels).toEqual(expect.arrayContaining([{ name: LabelName.FEATURE, value: "native-runtime" }]));
      expect(result.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "runtime step" })]));

      const runtimeStep = result.steps.find((entry) => entry.name === "runtime step");
      const runtimeAttachment = runtimeStep?.steps
        .flatMap((entry) => entry.attachments)
        .find((entry) => entry.name === "runtime attachment");

      expect(runtimeAttachment).toBeDefined();
      expect(readAttachment(attachments, runtimeAttachment!.source)).toBe("hello node");
    },
  );

  it.skipIf(!supportsNodeTestRuntimeApi)("writes runtime API data from native hooks", async () => {
    const { attachments, exitCode, tests } = await runNodeInlineTest(
      {
        "hook-runtime.test.mjs": `
          import { describe, it, before, beforeEach, afterEach, after } from "node:test";
          import assert from "node:assert/strict";
          import { attachment, label, step } from "allure-js-commons";

          describe("hook runtime suite", () => {
            before(async () => {
              await label("owner", "before-hook");
            });

            beforeEach(async () => {
              await label("feature", "before-each-hook");
              await step("beforeEach runtime step", async () => {});
            });

            afterEach(async () => {
              await attachment("afterEach runtime attachment", "after each body", "text/plain");
            });

            after(async () => {
              await label("story", "after-hook");
            });

            it("uses hook runtime API", () => {
              assert.equal(1 + 1, 2);
            });

            it("also uses hook runtime API", () => {
              assert.equal(3 + 3, 6);
            });
          });
        `,
        "hook-runtime-cjs.test.cjs": `
          const assert = require("node:assert/strict");
          const { test, beforeEach } = require("node:test");
          const { label } = require("allure-js-commons");

          beforeEach(async () => {
            await label("tag", "cjs-before-each-hook");
          });

          test("uses cjs hook runtime API", () => {
            assert.equal(2 + 2, 4);
          });
        `,
      },
      { setup: true },
    );

    expect(exitCode).toBe(0);

    for (const result of [
      getTestByName(tests, "uses hook runtime API"),
      getTestByName(tests, "also uses hook runtime API"),
    ]) {
      expect(result.labels).toEqual(
        expect.arrayContaining([
          { name: LabelName.OWNER, value: "before-hook" },
          { name: LabelName.FEATURE, value: "before-each-hook" },
          { name: LabelName.STORY, value: "after-hook" },
        ]),
      );
      expect(result.steps).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "beforeEach runtime step" })]),
      );

      const runtimeAttachment = result.steps
        .flatMap((entry) => entry.attachments)
        .concat(result.attachments)
        .find((entry) => entry.name === "afterEach runtime attachment");

      expect(runtimeAttachment).toBeDefined();
      expect(readAttachment(attachments, runtimeAttachment!.source)).toBe("after each body");
    }

    expect(getTestByName(tests, "uses cjs hook runtime API").labels).toEqual(
      expect.arrayContaining([{ name: LabelName.TAG, value: "cjs-before-each-hook" }]),
    );
  });
});
