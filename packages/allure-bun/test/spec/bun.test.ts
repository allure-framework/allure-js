import { join } from "node:path";

import { Stage, Status } from "allure-js-commons";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { expect, it } from "vitest";

import { finishFileContext } from "../../src/lifecycle.js";
import { createFileContext, createRunState } from "../../src/state.js";
import { isBunAvailable, runBunInlineTest } from "../utils.js";

const bunIt = isBunAvailable ? it : it.skip;

const getTestByName = (tests: TestResult[], name: string) => {
  const test = tests.find((entry) => entry.name === name);

  expect(test, `Expected Bun result "${name}" to be present`).toBeDefined();

  return test!;
};

const getTestsByName = (tests: TestResult[], name: string) => {
  const matches = tests.filter((entry) => entry.name === name);

  expect(matches, `Expected Bun results named "${name}" to be present`).not.toHaveLength(0);

  return matches;
};

const hasFixtureStep = (groups: TestResultContainer[], fixtureType: "befores" | "afters", stepName: string) => {
  return groups.some(
    (group) =>
      Array.isArray(group[fixtureType]) &&
      group[fixtureType].some(
        (fixture) => Array.isArray(fixture.steps) && fixture.steps.some((step) => step.name === stepName),
      ),
  );
};

it("writes Bun global metadata once across multiple file contexts", () => {
  const runState = createRunState();
  const firstFileContext = createFileContext("/tmp/first.test.ts", runState);
  const secondFileContext = createFileContext("/tmp/second.test.ts", runState);
  let environmentInfoWrites = 0;
  let categoriesWrites = 0;

  for (const fileContext of [firstFileContext, secondFileContext]) {
    fileContext.allureRuntime.environmentInfo = { build: "123" };
    fileContext.allureRuntime.categories = [{ name: "known issue" }];
    fileContext.allureRuntime.writeEnvironmentInfo = () => {
      environmentInfoWrites += 1;
    };
    fileContext.allureRuntime.writeCategoriesDefinitions = () => {
      categoriesWrites += 1;
    };
  }

  finishFileContext(
    {
      activateFileContext: () => {},
      throwConcurrentUnsupported: () => {},
    },
    firstFileContext,
  );
  finishFileContext(
    {
      activateFileContext: () => {},
      throwConcurrentUnsupported: () => {},
    },
    secondFileContext,
  );

  expect(environmentInfoWrites).toBe(1);
  expect(categoriesWrites).toBe(1);
});

bunIt("reports Bun tests, hooks, serial tests, skips and todos", async () => {
  const { tests, groups, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
      import { label, logStep, step } from "allure-js-commons";

      beforeAll(async () => {
        await logStep("root before all");
      });

      afterAll(async () => {
        await logStep("root after all");
      });

      describe("Allure Bun", () => {
        beforeAll(async () => {
          await logStep("suite before all");
        });

        afterAll(async () => {
          await logStep("suite after all");
        });

        beforeEach(async () => {
          await logStep("suite before each");
          await label("feature", "hooked feature");
        });

        afterEach(async () => {
          await logStep("suite after each");
        });

        it("sample passed test", async () => {
          await label("severity", "critical");
          await step("do something", async () => {});
          expect(1 + 1).toBe(2);
        });

        test.serial("serial first", () => {
          expect(true).toBe(true);
        });

        test.serial("serial second", () => {
          expect(true).toBe(true);
        });

        it.skip("sample skipped test", () => {
          expect(true).toBe(true);
        });

        describe("nested suite", () => {
          beforeAll(async () => {
            await logStep("nested before all");
          });

          afterAll(async () => {
            await logStep("nested after all");
          });

          it("nested passed test", () => {
            expect(true).toBe(true);
          });
        });
      });

      describe.skip("Skipped suite", () => {
        it("skipped by skipped suite", () => {
          expect(true).toBe(true);
        });
      });

      test.todo("sample todo test");
    `,
  });

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(7);

  const passed = getTestByName(tests, "sample passed test");
  expect(passed).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#Allure Bun sample passed test",
    }),
  );
  expect(passed.labels).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "framework", value: "bun" }),
      expect.objectContaining({ name: "severity", value: "critical" }),
      expect.objectContaining({ name: "feature", value: "hooked feature" }),
    ]),
  );
  expect(passed.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "do something" })]));

  expect(getTestByName(tests, "serial first")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "serial second")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "sample skipped test")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "skipped by skipped suite")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "sample todo test")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
  expect(getTestByName(tests, "nested passed test")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#Allure Bun nested suite nested passed test",
    }),
  );

  expect(hasFixtureStep(groups, "befores", "suite before each")).toBe(true);
  expect(hasFixtureStep(groups, "afters", "suite after each")).toBe(true);
  expect(hasFixtureStep(groups, "befores", "root before all")).toBe(true);
  expect(hasFixtureStep(groups, "afters", "root after all")).toBe(true);
});

bunIt("reports afterAll registered after top-level await", async () => {
  const { tests, groups, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { afterAll, expect, test } from "bun:test";
      import { logStep } from "allure-js-commons";

      test("before await", () => {
        expect(true).toBe(true);
      });

      await Promise.resolve();

      afterAll(async () => {
        await logStep("late after all");
      });
    `,
  });

  expect(exitCode).toBe(0);
  expect(getTestByName(tests, "before await")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(hasFixtureStep(groups, "afters", "late after all")).toBe(true);
});

bunIt("supports the full Allure runtime facade in Bun context", async () => {
  const { tests, groups, globals, envInfo, categories, attachments, exitCode } = await runBunInlineTest(
    {
      "payload.txt": "payload from path",
      "sample.test.ts": `
        import { beforeAll, beforeEach, expect, test } from "bun:test";
        import {
          Status,
          attachment,
          attachmentPath,
          description,
          descriptionHtml,
          displayName,
          globalAttachment,
          globalAttachmentPath,
          globalError,
          historyId,
          issue,
          label,
          link,
          logStep,
          parameter,
          parentSuite,
          step,
          subSuite,
          suite,
          tag,
          testCaseId,
        } from "allure-js-commons";

        await globalAttachment("before registration", "early", { contentType: "text/plain" });

        beforeAll(async () => {
          await label("fromBeforeAll", "yes");
        });

        beforeEach(async () => {
          await parameter("hookParam", "hook", { excluded: true });
        });

        test("full runtime @allure.id=42", async () => {
          await displayName("renamed runtime test");
          await description("runtime markdown");
          await descriptionHtml("<b>runtime html</b>");
          await historyId("manual-history");
          await testCaseId("manual-case");
          await suite("custom suite");
          await parentSuite("custom parent");
          await subSuite("custom sub");
          await label("custom", "value");
          await tag("runtime");
          await parameter("secret", "hidden", { mode: "hidden" });
          await link("https://example.test/generic", "generic", "link");
          await issue("ISSUE-1", "issue name");
          await attachment("inline attachment", "hello", { contentType: "text/plain" });
          await attachmentPath("path attachment", "./payload.txt", { contentType: "text/plain" });
          await globalAttachmentPath("global path", "./payload.txt", { contentType: "text/plain" });
          await globalError({ message: "global problem", trace: "trace" });
          await logStep("instant broken", Status.BROKEN, new Error("instant err"));
          await step("outer step", async (ctx) => {
            await ctx.displayName("renamed outer");
            await ctx.parameter("stepParam", "stepValue");
            await step("inner step", async () => {});
          });

          expect(true).toBe(true);
        });
      `,
    },
    {
      env: () => ({
        ALLURE_BUN_CONFIG: JSON.stringify({
          environmentInfo: { runtime: "bun" },
          categories: [{ name: "known", messageRegex: "global problem" }],
          globalLabels: { layer: "api" },
          links: {
            issue: {
              urlTemplate: "https://issues.example/%s",
            },
          },
        }),
      }),
    },
  );

  expect(exitCode).toBe(0);
  expect(envInfo).toEqual({ runtime: "bun" });
  expect(categories).toEqual([expect.objectContaining({ name: "known", messageRegex: "global problem" })]);

  const result = getTestByName(tests, "renamed runtime test");

  expect(result).toEqual(
    expect.objectContaining({
      historyId: "manual-history",
      testCaseId: "manual-case",
      description: "runtime markdown",
      descriptionHtml: "<b>runtime html</b>",
      status: Status.PASSED,
    }),
  );
  expect(result.fullName).toBe("sample.test.ts#full runtime");
  expect(result.labels).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "ALLURE_ID", value: "42" }),
      expect.objectContaining({ name: "custom", value: "value" }),
      expect.objectContaining({ name: "tag", value: "runtime" }),
      expect.objectContaining({ name: "fromBeforeAll", value: "yes" }),
      expect.objectContaining({ name: "layer", value: "api" }),
      expect.objectContaining({ name: "parentSuite", value: "custom parent" }),
      expect.objectContaining({ name: "suite", value: "custom suite" }),
      expect.objectContaining({ name: "subSuite", value: "custom sub" }),
    ]),
  );
  expect(result.labels.filter(({ name }) => name === "suite")).toEqual([{ name: "suite", value: "custom suite" }]);
  expect(result.labels.filter(({ name }) => name === "subSuite")).toEqual([{ name: "subSuite", value: "custom sub" }]);
  expect(result.parameters).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "secret", value: "hidden", mode: "hidden" }),
      expect.objectContaining({ name: "hookParam", value: "hook", excluded: true }),
    ]),
  );
  expect(result.links).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "link", url: "https://example.test/generic", name: "generic" }),
      expect.objectContaining({ type: "issue", url: "https://issues.example/ISSUE-1", name: "issue name" }),
    ]),
  );
  expect(result.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "inline attachment" }),
      expect.objectContaining({ name: "path attachment" }),
      expect.objectContaining({
        name: "instant broken",
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({ message: "instant err" }),
      }),
      expect.objectContaining({
        name: "renamed outer",
        parameters: [expect.objectContaining({ name: "stepParam", value: "stepValue" })],
        steps: [expect.objectContaining({ name: "inner step" })],
      }),
    ]),
  );
  expect(Object.values(attachments).map((value) => value.toString())).toEqual(
    expect.arrayContaining(["hello", "payload from path"]),
  );
  expect(
    Object.values(globals ?? {}).flatMap((entry) => entry.attachments.map((attachment) => attachment.name)),
  ).toEqual(expect.arrayContaining(["before registration", "global path"]));
  expect(Object.values(globals ?? {}).flatMap((entry) => entry.errors.map((error) => error.message))).toEqual([
    "global problem",
  ]);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        befores: expect.arrayContaining([expect.objectContaining({ status: Status.PASSED })]),
      }),
    ]),
  );
});

bunIt("reports Bun retry attempts as separate Allure results", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { expect, test } from "bun:test";

      let attempts = 0;

      test("flaky retry", { retry: 1 }, () => {
        attempts += 1;
        expect(attempts).toBe(2);
      });
    `,
  });

  expect(exitCode).toBe(0);

  const retryResults = getTestsByName(tests, "flaky retry");
  const failedAttempt = retryResults.find((test) => test.status === Status.FAILED);
  const passedAttempt = retryResults.find((test) => test.status === Status.PASSED);

  expect(retryResults).toHaveLength(2);
  expect(failedAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("Expected: 2"),
      }),
    }),
  );
  expect(passedAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      parameters: expect.arrayContaining([expect.objectContaining({ name: "Retry", value: "1", excluded: true })]),
    }),
  );
  expect(passedAttempt?.historyId).toBe(failedAttempt?.historyId);
});

bunIt("keeps hook context isolated across multiple Bun files", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "hook-context-a.test.ts": `
      import { beforeAll, expect, it } from "bun:test";
      import { logStep } from "allure-js-commons";

      beforeAll(async () => {
        await logStep("alpha before all");
      });

      it("alpha test", () => {
        expect(true).toBe(true);
      });
    `,
    "hook-context-b.test.ts": `
      import { beforeAll, expect, it } from "bun:test";
      import { logStep } from "allure-js-commons";

      beforeAll(async () => {
        await logStep("beta before all");
      });

      it("beta test", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(exitCode).toBe(0);

  const alphaTest = getTestByName(tests, "alpha test");
  const betaTest = getTestByName(tests, "beta test");

  expect(alphaTest.fullName).toBe("hook-context-a.test.ts#alpha test");
  expect(betaTest.fullName).toBe("hook-context-b.test.ts#beta test");
  expect(alphaTest.labels).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "package", value: "hook-context-a.test.ts" })]),
  );
  expect(betaTest.labels).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "package", value: "hook-context-b.test.ts" })]),
  );
});

bunIt("reports tests from sibling top-level suites", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { describe, expect, it } from "bun:test";

      describe("suite A", () => {
        it("test A", () => {
          expect(true).toBe(true);
        });
      });

      describe("suite B", () => {
        it("test B", () => {
          expect(true).toBe(true);
        });
      });
    `,
  });

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(2);
  expect(getTestByName(tests, "test A").fullName).toBe("sample.test.ts#suite A test A");
  expect(getTestByName(tests, "test B").fullName).toBe("sample.test.ts#suite B test B");
});

bunIt("keeps Bun file paths with parentheses in the reported package name", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "paren(dir)/file(name).test.ts": `
      import { expect, test } from "bun:test";

      test("paren path", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "paren path",
      fullName: "paren(dir)/file(name).test.ts#paren path",
      titlePath: ["paren(dir)", "file(name).test.ts"],
      labels: expect.arrayContaining([
        expect.objectContaining({ name: "package", value: "paren(dir).file(name).test.ts" }),
      ]),
    }),
  );
});

bunIt("reports Bun hook failures consistently", async () => {
  const { tests, groups, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";

      describe("beforeAll failure", () => {
        beforeAll(() => {
          throw new Error("beforeAll boom");
        });

        it("skipped by beforeAll 1", () => {});
        it("skipped by beforeAll 2", () => {});
      });

      describe("beforeEach failure", () => {
        beforeEach(() => {
          throw new Error("beforeEach boom");
        });

        it("skipped by beforeEach", () => {});
      });

      describe("afterEach failure", () => {
        afterEach(() => {
          throw new Error("afterEach boom");
        });

        it("afterEach keeps test passed", () => {
          expect(true).toBe(true);
        });
      });

      describe("afterAll failure", () => {
        afterAll(() => {
          throw new Error("afterAll boom");
        });

        it("afterAll keeps test passed", () => {
          expect(true).toBe(true);
        });
      });
    `,
  });

  expect(exitCode).toBe(1);

  expect(getTestByName(tests, "skipped by beforeAll 1")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "beforeAll boom",
      }),
    }),
  );
  expect(getTestByName(tests, "skipped by beforeAll 2")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "beforeAll boom",
      }),
    }),
  );
  expect(getTestByName(tests, "skipped by beforeEach")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "beforeEach boom",
      }),
    }),
  );
  expect(getTestByName(tests, "afterEach keeps test passed")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "beforeAll boom",
            }),
          }),
        ]),
      }),
      expect.objectContaining({
        name: "beforeEach",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "beforeEach boom",
            }),
          }),
        ]),
      }),
      expect.objectContaining({
        name: "afterEach",
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "afterEach boom",
            }),
          }),
        ]),
      }),
    ]),
  );
});

bunIt("respects the Allure test plan at registration time", async () => {
  const testPlanFilename = "testplan.json";
  const { tests, groups, exitCode } = await runBunInlineTest(
    {
      [testPlanFilename]: JSON.stringify({
        version: "1.0",
        tests: [{ selector: "sample.test.ts#selected test" }],
      }),
      "sample.test.ts": `
        import { afterAll, beforeAll, describe, expect, it } from "bun:test";

        it("selected test", () => {
          expect(true).toBe(true);
        });

        describe("excluded suite", () => {
          beforeAll(() => {
            throw new Error("excluded beforeAll executed");
          });

          afterAll(() => {
            throw new Error("excluded afterAll executed");
          });

          it("excluded test", () => {
            throw new Error("excluded test executed");
          });
        });
      `,
    },
    {
      env: (testDir) => ({
        ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
      }),
    },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "selected test",
      status: Status.PASSED,
      fullName: "sample.test.ts#selected test",
    }),
  );
  expect(groups).toHaveLength(0);
});

bunIt("respects Allure test plan ids from title metadata", async () => {
  const testPlanFilename = "testplan.json";
  const { tests, exitCode } = await runBunInlineTest(
    {
      [testPlanFilename]: JSON.stringify({
        version: "1.0",
        tests: [{ id: 77 }],
      }),
      "sample.test.ts": `
        import { expect, it } from "bun:test";

        it("selected by id @allure.id=77", () => {
          expect(true).toBe(true);
        });

        it("excluded by plan @allure.id=78", () => {
          throw new Error("excluded test executed");
        });
      `,
    },
    {
      env: (testDir) => ({
        ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
      }),
    },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "selected by id",
      status: Status.PASSED,
      fullName: "sample.test.ts#selected by id",
      labels: expect.arrayContaining([
        expect.objectContaining({
          name: "ALLURE_ID",
          value: "77",
        }),
      ]),
    }),
  );
});

bunIt("matches Bun --todo mode for expected todo failures", async () => {
  const { tests, exitCode } = await runBunInlineTest(
    {
      "sample.test.ts": `
        import { expect, test } from "bun:test";

        test.todo("todo that fails", () => {
          expect(1).toBe(2);
        });
      `,
    },
    {
      args: ["--todo"],
    },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "todo that fails",
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("TODO"),
        trace: expect.any(String),
      }),
    }),
  );
});

bunIt("matches Bun --todo mode for unexpected todo passes", async () => {
  const { tests, exitCode, stdout, stderr } = await runBunInlineTest(
    {
      "sample.test.ts": `
        import { expect, test } from "bun:test";

        test.todo("todo that passes", () => {
          expect(1).toBe(1);
        });
      `,
    },
    {
      args: ["--todo"],
    },
  );

  expect(exitCode).toBe(1);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "todo that passes",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("marked as todo"),
      }),
    }),
  );
  expect(`${stdout.join("\n")}\n${stderr.join("\n")}`).toContain("todo that passes");
});
