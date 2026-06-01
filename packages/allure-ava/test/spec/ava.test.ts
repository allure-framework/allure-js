import { Stage, Status } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { runAvaInlineTest } from "../utils.js";

const getTestByName = <T extends { name?: string }>(tests: T[], name: string) => {
  const test = tests.find((entry) => entry.name === name);

  expect(test, `Expected AVA result "${name}" to be present`).toBeDefined();

  return test!;
};

const readAttachment = (attachments: Record<string, Buffer | string>, source: string) => {
  const content = attachments[source];

  expect(content, `Expected attachment "${source}" to be present`).toBeDefined();

  return Buffer.isBuffer(content) ? content.toString("utf8") : Buffer.from(content, "base64").toString("utf8");
};

const expectLabel = <T extends { labels?: { name: string; value: string }[] }>(
  test: T,
  name: string,
  value: string,
) => {
  expect(test.labels).toEqual(expect.arrayContaining([expect.objectContaining({ name, value })]));
};

describe("allure-ava", () => {
  it("reports AVA test statuses", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "sample.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("passed test", (t) => {
          t.pass();
        });

        test("failed test", (t) => {
          t.is(1, 2);
        });

        test("broken test", () => {
          throw new TypeError("boom");
        });

        test.skip("skipped test", () => {});
        test.todo("todo test");

        test.skipIf(true)("skipIf test", () => {
          throw new Error("skipIf test executed");
        });

        test.runIf(false)("runIf test", () => {
          throw new Error("runIf test executed");
        });
      `,
    });

    expect(exitCode).toBe(1);
    expect(tests).toHaveLength(7);
    expect(getTestByName(tests, "passed test")).toEqual(
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    );
    expect(getTestByName(tests, "failed test")).toEqual(
      expect.objectContaining({
        status: Status.FAILED,
        stage: Stage.FINISHED,
      }),
    );
    expect(getTestByName(tests, "broken test")).toEqual(
      expect.objectContaining({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: "Error thrown in test",
          trace: expect.stringContaining("TypeError: boom"),
        }),
      }),
    );
    expect(getTestByName(tests, "skipped test")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
      }),
    );
    expect(getTestByName(tests, "todo test")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
      }),
    );
    expect(getTestByName(tests, "skipIf test")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
      }),
    );
    expect(getTestByName(tests, "runIf test")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
      }),
    );
  });

  it("reports stable identity fields", async () => {
    const firstRun = await runAvaInlineTest({
      "identity.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("identity test", (t) => {
          t.pass();
        });
      `,
    });
    const secondRun = await runAvaInlineTest({
      "identity.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("identity test", (t) => {
          t.pass();
        });
      `,
    });
    const first = getTestByName(firstRun.tests, "identity test");
    const second = getTestByName(secondRun.tests, "identity test");

    expect(firstRun.exitCode).toBe(0);
    expect(secondRun.exitCode).toBe(0);
    expect(first).toEqual(
      expect.objectContaining({
        fullName: "identity.test.js#identity test",
        testCaseName: "identity test",
        titlePath: ["identity.test.js"],
        testCaseId: expect.any(String),
        historyId: expect.any(String),
      }),
    );
    expect(second.testCaseId).toBe(first.testCaseId);
    expect(second.historyId).toBe(first.historyId);
  });

  it("uses project-relative identity when AVA is run from a nested cwd", async () => {
    const { tests, exitCode } = await runAvaInlineTest(
      {
        "tests/cwd.test.js": ({ avaModulePath }) => `
          import test from "${avaModulePath}";

          test("cwd identity", (t) => {
            t.pass();
          });
        `,
      },
      {
        args: ["../../tests/cwd.test.js"],
        cwd: "nested/workdir",
      },
    );
    const test = getTestByName(tests, "cwd identity");

    expect(exitCode).toBe(0);
    expect(test).toEqual(
      expect.objectContaining({
        fullName: "tests/cwd.test.js#cwd identity",
        titlePath: ["tests", "cwd.test.js"],
      }),
    );
  });

  it("includes runtime parameters in generated history IDs", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "parameters.test.js": ({ avaModulePath, commonsModulePath }) => `
        import test from "${avaModulePath}";
        import { parameter, testCaseId } from "${commonsModulePath}";

        test("first parameterized case", async (t) => {
          await testCaseId("same-parameterized-case");
          await parameter("variant", "one");
          t.pass();
        });

        test("second parameterized case", async (t) => {
          await testCaseId("same-parameterized-case");
          await parameter("variant", "two");
          t.pass();
        });
      `,
    });
    const first = getTestByName(tests, "first parameterized case");
    const second = getTestByName(tests, "second parameterized case");

    expect(exitCode).toBe(0);
    expect(first.testCaseId).toBe("same-parameterized-case");
    expect(second.testCaseId).toBe("same-parameterized-case");
    expect(first.historyId).not.toBe(second.historyId);
  });

  it("captures runtime metadata, steps and attachments", async () => {
    const { tests, attachments, exitCode } = await runAvaInlineTest({
      "runtime.test.js": ({ avaModulePath, commonsModulePath }) => `
        import { writeFileSync } from "node:fs";
        import test from "${avaModulePath}";
        import {
          attachment,
          attachmentPath,
          description,
          displayName,
          historyId,
          label,
          link,
          parameter,
          step,
          testCaseId,
        } from "${commonsModulePath}";

        test("runtime api", async (t) => {
          writeFileSync("path-payload.txt", "hello path attachment");
          await displayName("renamed runtime api");
          await description("runtime description");
          await link("https://example.test/TMS-1", "TMS-1", "tms");
          await parameter("browser", "chromium");
          await historyId("custom-history");
          await testCaseId("custom-test-case");
          await label("feature", "ava integration");
          await step("outer step", async (stepContext) => {
            await stepContext.parameter("attempt", "1");
            await attachment("payload", "hello ava", "text/plain");
            await attachmentPath("path payload", "path-payload.txt", "text/plain");
          });
          t.pass();
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0]).toEqual(
      expect.objectContaining({
        name: "renamed runtime api",
        status: Status.PASSED,
        description: "runtime description",
        historyId: "custom-history",
        testCaseId: "custom-test-case",
        parameters: expect.arrayContaining([expect.objectContaining({ name: "browser", value: "chromium" })]),
        links: expect.arrayContaining([
          expect.objectContaining({ name: "TMS-1", type: "tms", url: "https://example.test/TMS-1" }),
        ]),
        labels: expect.arrayContaining([expect.objectContaining({ name: "feature", value: "ava integration" })]),
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "outer step",
            parameters: expect.arrayContaining([expect.objectContaining({ name: "attempt", value: "1" })]),
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "payload",
                attachments: expect.arrayContaining([expect.objectContaining({ name: "payload" })]),
              }),
            ]),
          }),
        ]),
      }),
    );

    const nestedAttachments = tests[0].steps[0].steps.flatMap((step) => step.attachments);
    const payloadAttachment = nestedAttachments.find((entry) => entry.name === "payload");
    const pathAttachment = nestedAttachments.find((entry) => entry.name === "path payload");

    expect(payloadAttachment).toBeDefined();
    expect(readAttachment(attachments, payloadAttachment!.source)).toBe("hello ava");
    expect(pathAttachment).toBeDefined();
    expect(readAttachment(attachments, pathAttachment!.source)).toBe("hello path attachment");
  });

  it("captures sync runtime API calls", async () => {
    const { tests, attachments, exitCode } = await runAvaInlineTest({
      "sync-runtime.test.js": ({ avaModulePath, commonsModulePath }) => `
        import test from "${avaModulePath}";
        import * as allure from "${commonsModulePath.replace(/index\\.js$/, "sync.js")}";

        test("sync runtime api", (t) => {
          allure.label("layer", "unit");
          allure.step("sync step", () => {
            allure.attachment("sync payload", "hello sync", "text/plain");
          });
          t.pass();
        });
      `,
    });
    const test = getTestByName(tests, "sync runtime api");
    const attachment = test.steps[0].steps[0].attachments.find((entry) => entry.name === "sync payload");

    expect(exitCode).toBe(0);
    expectLabel(test, "layer", "unit");
    expect(test.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "sync step",
        }),
      ]),
    );
    expect(attachment).toBeDefined();
    expect(readAttachment(attachments, attachment!.source)).toBe("hello sync");
  });

  it("parses Allure metadata from AVA test titles", async () => {
    const { tests, exitCode } = await runAvaInlineTest(
      {
        "title-metadata.test.js": ({ avaModulePath }) => `
          import test from "${avaModulePath}";

          test("title metadata @allure.label.owner=jane @allure.id=AVA-42 @allure.link.issue=ISSUE-1", (t) => {
            t.pass();
          });
        `,
      },
      {
        reporterConfig: {
          links: {
            issue: {
              nameTemplate: "Issue %s",
              urlTemplate: "https://example.test/%s",
            },
          },
        },
      },
    );
    const test = getTestByName(tests, "title metadata");

    expect(exitCode).toBe(0);
    expect(test).toEqual(
      expect.objectContaining({
        fullName: "title-metadata.test.js#title metadata",
        testCaseName: "title metadata",
      }),
    );
    expectLabel(test, "owner", "jane");
    expectLabel(test, "ALLURE_ID", "AVA-42");
    expect(test.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Issue ISSUE-1", type: "issue", url: "https://example.test/ISSUE-1" }),
      ]),
    );
  });

  it("filters tests through ALLURE_TESTPLAN_PATH before execution", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "ava.config.mjs": ({ allureAvaIndexPath, allureAvaSetupPath, allureResultsPath }) => `
        import { installAllureAva } from "${allureAvaIndexPath}";

        process.env.ALLURE_TESTPLAN_PATH = new URL("./testplan.json", import.meta.url).pathname;

        await installAllureAva({
          reporterConfig: {
            resultsDir: ${JSON.stringify(allureResultsPath)},
          },
          setupModule: ${JSON.stringify(allureAvaSetupPath)},
        });

        export default {};
      `,
      "testplan.json": JSON.stringify({
        version: "1.0",
        tests: [
          { selector: "plans/selector.test.js#selected by selector" },
          { selector: "plans/id.test.js#selected by clean selector" },
          { id: "AVA-PLAN-1" },
        ],
      }),
      "plans/id.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("selected by id @allure.id=AVA-PLAN-1", (t) => {
          t.pass();
        });

        test("selected by clean selector @allure.id=AVA-NOPE", (t) => {
          t.pass();
        });

        test("unselected by id @allure.id=AVA-NOPE", () => {
          throw new Error("unselected id test executed");
        });
      `,
      "plans/selector.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("selected by selector", (t) => {
          t.pass();
        });

        test("unselected by selector", () => {
          throw new Error("unselected selector test executed");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(3);
    expect(getTestByName(tests, "selected by id")).toEqual(
      expect.objectContaining({
        fullName: "plans/id.test.js#selected by id",
      }),
    );
    expect(getTestByName(tests, "selected by clean selector")).toEqual(
      expect.objectContaining({
        fullName: "plans/id.test.js#selected by clean selector",
      }),
    );
    expect(getTestByName(tests, "selected by selector")).toBeDefined();
    expect(tests.map((test) => test.name)).not.toContain("unselected by id");
    expect(tests.map((test) => test.name)).not.toContain("unselected by selector");
  });

  it("runs all tests when ALLURE_TESTPLAN_PATH is missing", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "ava.config.mjs": ({ allureAvaIndexPath, allureAvaSetupPath, allureResultsPath }) => `
        import { installAllureAva } from "${allureAvaIndexPath}";

        process.env.ALLURE_TESTPLAN_PATH = new URL("./missing-testplan.json", import.meta.url).pathname;

        await installAllureAva({
          reporterConfig: {
            resultsDir: ${JSON.stringify(allureResultsPath)},
          },
          setupModule: ${JSON.stringify(allureAvaSetupPath)},
        });

        export default {};
      `,
      "missing-plan.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test("first without plan", (t) => {
          t.pass();
        });

        test("second without plan", (t) => {
          t.pass();
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests.map((test) => test.name).sort()).toEqual(["first without plan", "second without plan"]);
  });

  it("reports hooks as fixtures and attaches native AVA logs", async () => {
    const { tests, groups, attachments, exitCode } = await runAvaInlineTest({
      "hooks.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test.beforeEach((t) => {
          t.log("before log");
        });

        test.afterEach.always((t) => {
          t.log("after log");
        });

        test("hooks and logs", (t) => {
          t.log("test log");
          t.pass();
        });
      `,
    });
    const test = getTestByName(tests, "hooks and logs");
    const logAttachment = test.attachments.find((entry) => entry.name === "AVA logs");
    const beforeFixture = groups
      .flatMap((group) => group.befores)
      .find((fixture) => fixture.name?.includes("beforeEach hook"));
    const afterFixture = groups
      .flatMap((group) => group.afters)
      .find((fixture) => fixture.name?.includes("afterEach.always hook"));

    expect(exitCode).toBe(0);
    expect(logAttachment).toBeDefined();
    expect(readAttachment(attachments, logAttachment!.source)).toContain("test log");
    expect(beforeFixture).toEqual(expect.objectContaining({ status: Status.PASSED }));
    expect(afterFixture).toEqual(expect.objectContaining({ status: Status.PASSED }));
  });

  it("propagates before hook metadata without leaking after hook metadata", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "fixture-metadata.test.js": ({ avaModulePath, commonsModulePath }) => `
        import test from "${avaModulePath}";
        import { label, parameter } from "${commonsModulePath}";

        test.beforeEach(async () => {
          await label("fixture", "before");
          await parameter("fixtureParam", "visible");
        });

        test.afterEach.always(async () => {
          await label("fixture", "after");
        });

        test("fixture metadata", (t) => {
          t.pass();
        });
      `,
    });
    const test = getTestByName(tests, "fixture metadata");

    expect(exitCode).toBe(0);
    expectLabel(test, "fixture", "before");
    expect(test.labels).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "fixture", value: "after" })]),
    );
    expect(test.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "fixtureParam", value: "visible" })]),
    );
  });

  it("reports failing hooks as broken fixtures", async () => {
    const { tests, groups, exitCode } = await runAvaInlineTest({
      "failing-hook.test.js": ({ avaModulePath }) => `
        import test from "${avaModulePath}";

        test.beforeEach(() => {
          throw new Error("setup exploded");
        });

        test("blocked by hook", (t) => {
          t.pass();
        });
      `,
    });
    const test = getTestByName(tests, "blocked by hook");
    const beforeFixture = groups
      .flatMap((group) => group.befores)
      .find((fixture) => fixture.name?.includes("beforeEach hook"));

    expect(exitCode).toBe(1);
    expect(test).toEqual(expect.objectContaining({ status: Status.BROKEN }));
    expect(beforeFixture).toEqual(
      expect.objectContaining({
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          trace: expect.stringContaining("setup exploded"),
        }),
      }),
    );
  });

  it("writes run-level artifacts and global runtime messages", async () => {
    const { tests, attachments, categories, envInfo, globals, exitCode } = await runAvaInlineTest(
      {
        "run-artifacts.test.js": ({ avaModulePath, commonsModulePath }) => `
          import test from "${avaModulePath}";
          import { globalAttachment, globalError } from "${commonsModulePath}";

          await globalAttachment("global payload", "hello global", "text/plain");
          await globalError({ message: "global boom", trace: "global trace" });

          test("run artifacts", (t) => {
            t.pass();
          });
        `,
      },
      {
        reporterConfig: {
          categories: [
            {
              name: "Assertion failures",
              matchedStatuses: [Status.FAILED],
            },
          ],
          environmentInfo: {
            adapter: "ava",
          },
          globalLabels: {
            layer: "api",
          },
        },
      },
    );
    const test = getTestByName(tests, "run artifacts");
    const globalEntries = Object.values(globals ?? {});
    const globalAttachment = globalEntries
      .flatMap((entry) => entry.attachments)
      .find((entry) => entry.name === "global payload");
    const globalError = globalEntries.flatMap((entry) => entry.errors).find((entry) => entry.message === "global boom");

    expect(exitCode).toBe(0);
    expect(envInfo).toEqual(expect.objectContaining({ adapter: "ava" }));
    expect(categories).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Assertion failures" })]));
    expectLabel(test, "layer", "api");
    expect(globalAttachment).toBeDefined();
    expect(readAttachment(attachments, globalAttachment!.source)).toBe("hello global");
    expect(globalError).toEqual(expect.objectContaining({ trace: "global trace" }));
  });

  it("keeps concurrent runtime messages scoped to the active AVA test", async () => {
    const { tests, exitCode } = await runAvaInlineTest({
      "concurrent.test.js": ({ avaModulePath, commonsModulePath }) => `
        import test from "${avaModulePath}";
        import { label, step } from "${commonsModulePath}";

        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        test("first concurrent", async (t) => {
          await step("first step", async () => {
            await wait(20);
          });
          await label("story", "first");
          t.pass();
        });

        test("second concurrent", async (t) => {
          await label("story", "second");
          await step("second step", async () => {
            await wait(1);
          });
          t.pass();
        });
      `,
    });

    expect(exitCode).toBe(0);
    const first = getTestByName(tests, "first concurrent");
    const second = getTestByName(tests, "second concurrent");

    expect(first.labels).toEqual(expect.arrayContaining([expect.objectContaining({ name: "story", value: "first" })]));
    expect(first.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "first step" })]));
    expect(first.steps).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "second step" })]));
    expect(second.labels).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "story", value: "second" })]),
    );
    expect(second.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "second step" })]));
    expect(second.steps).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "first step" })]));
  });

  it("keeps runtime messages isolated across parallel AVA worker files", async () => {
    const { tests, exitCode } = await runAvaInlineTest(
      {
        "workers/first.test.js": ({ avaModulePath, commonsModulePath }) => `
          import test from "${avaModulePath}";
          import { label, step } from "${commonsModulePath}";

          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

          test("same title", async (t) => {
            await step("first worker step", async () => {
              await wait(30);
            });
            await label("worker", "first");
            t.pass();
          });
        `,
        "workers/second.test.js": ({ avaModulePath, commonsModulePath }) => `
          import test from "${avaModulePath}";
          import { label, step } from "${commonsModulePath}";

          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

          test("same title", async (t) => {
            await label("worker", "second");
            await step("second worker step", async () => {
              await wait(1);
            });
            t.pass();
          });
        `,
      },
      ["--concurrency=2"],
    );
    const first = tests.find((test) => test.fullName === "workers/first.test.js#same title");
    const second = tests.find((test) => test.fullName === "workers/second.test.js#same title");

    expect(exitCode).toBe(0);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expectLabel(first!, "worker", "first");
    expect(first!.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "first worker step" })]));
    expect(first!.steps).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "second worker step" })]));
    expectLabel(second!, "worker", "second");
    expect(second!.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "second worker step" })]));
    expect(second!.steps).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "first worker step" })]));
  });
});
