import { join } from "node:path";

import { Stage, Status } from "allure-js-commons";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { expect, it } from "vitest";

import { finishFileContext } from "../../src/bun/lifecycle.js";
import { createFileContext, createRunState } from "../../src/bun/state.js";
import { isBunAvailable, runBunInlineTest } from "../utils.js";

const bunIt = isBunAvailable ? it : it.skip;

const getTestByName = (tests: TestResult[], name: string) => {
  const test = tests.find((entry) => entry.name === name);

  expect(test, `Expected Bun result "${name}" to be present`).toBeDefined();

  return test!;
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
    fileContext.runtime.environmentInfo = { build: "123" };
    fileContext.runtime.categories = [{ name: "known issue" }];
    fileContext.runtime.writeEnvironmentInfo = () => {
      environmentInfoWrites += 1;
    };
    fileContext.runtime.writeCategoriesDefinitions = () => {
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
