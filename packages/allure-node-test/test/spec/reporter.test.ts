import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { InMemoryWriter } from "allure-js-commons/sdk/reporter";
import { describe, expect, it } from "vitest";

import type { NodeTestReporterConfig } from "../../src/model.js";
import { AllureNodeTestReporter } from "../../src/reporter.js";
import { writeRuntimeMessage } from "../../src/runtime.js";
import { getAllureFullNameFromParts, normalizeFilePath } from "../../src/utils.js";
import { getTestByName, readAttachment } from "./helpers.js";

const createReporter = (config: Partial<NodeTestReporterConfig> = {}) => {
  const runDir = mkdtempSync(join(tmpdir(), "allure-node-test-unit-"));
  const writer = new InMemoryWriter();
  const reporter = new AllureNodeTestReporter({
    writer,
    runDir,
    environmentInfo: { runtime: "node" },
    categories: [{ name: "known issue" }],
    globalLabels: { layer: "unit" },
    ...config,
  });

  return { reporter, runDir, writer };
};

describe("AllureNodeTestReporter", () => {
  it("maps nested Node test events to Allure results", () => {
    const { reporter, writer } = createReporter();
    const file = join(process.cwd(), "test/fixtures/sample.test.mjs");

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "Checkout",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "pays @allure.label.owner:alice @allure.id:42",
        nesting: 1,
        tags: ["smoke", "api"],
        testId: 10,
        details: {
          duration_ms: 7,
          type: "test",
        },
      },
    });

    reporter.finish();

    expect(writer.envInfo).toEqual({ runtime: "node" });
    expect(writer.categories).toEqual([{ name: "known issue" }]);
    const result = getTestByName(writer.tests, "pays");

    expect(result).toEqual(
      expect.objectContaining({
        fullName: "allure-node-test:test/fixtures/sample.test.mjs#Checkout pays",
        status: Status.PASSED,
        stage: Stage.FINISHED,
        titlePath: ["test", "fixtures", "sample.test.mjs", "Checkout"],
      }),
    );
    expect(result.labels).toEqual(
      expect.arrayContaining([
        { name: "framework", value: "node:test" },
        { name: LabelName.PARENT_SUITE, value: "Checkout" },
        { name: LabelName.OWNER, value: "alice" },
        { name: LabelName.ALLURE_ID, value: "42" },
        { name: LabelName.TAG, value: "smoke" },
        { name: LabelName.TAG, value: "api" },
        { name: LabelName.LAYER, value: "unit" },
      ]),
    );
  });

  it("applies runtime messages by test id and writes per-test output attachments", () => {
    const { reporter, runDir, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/runtime.test.mjs"));
    const allureFullName = getAllureFullNameFromParts(file, ["Runtime", "uses API"]);

    writeRuntimeMessage(runDir, {
      version: 1,
      pid: process.pid,
      testId: 12,
      file,
      nodeFullName: "Runtime > uses API",
      allureFullName,
      timestamp: Date.now(),
      message: {
        type: "metadata",
        data: {
          labels: [{ name: LabelName.FEATURE, value: "runtime" }],
          displayName: "uses runtime API",
        },
      },
    });
    writeRuntimeMessage(runDir, {
      version: 1,
      pid: process.pid,
      testId: 12,
      file,
      nodeFullName: "Runtime > uses API",
      allureFullName,
      timestamp: Date.now(),
      message: {
        type: "step_start",
        data: {
          name: "runtime step",
          start: Date.now(),
        },
      },
    });
    writeRuntimeMessage(runDir, {
      version: 1,
      pid: process.pid,
      testId: 12,
      file,
      nodeFullName: "Runtime > uses API",
      allureFullName,
      timestamp: Date.now(),
      message: {
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stop: Date.now(),
        },
      },
    });
    writeRuntimeMessage(runDir, {
      version: 1,
      pid: process.pid,
      testId: 12,
      file,
      nodeFullName: "Runtime > uses API",
      allureFullName,
      timestamp: Date.now(),
      message: {
        type: "attachment_content",
        data: {
          name: "runtime attachment",
          content: Buffer.from("hello").toString("base64"),
          encoding: "base64",
          contentType: ContentType.TEXT,
          fileExtension: "txt",
        },
      },
    });

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "Runtime",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:stdout",
      data: {
        file,
        message: "test stdout",
        testId: 12,
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "uses API",
        nesting: 1,
        testId: 12,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });

    reporter.finish();

    const result = getTestByName(writer.tests, "uses runtime API");

    expect(result.labels).toEqual(expect.arrayContaining([{ name: LabelName.FEATURE, value: "runtime" }]));
    expect(result.steps).toEqual(expect.arrayContaining([expect.objectContaining({ name: "runtime step" })]));
    expect(result.attachments).toHaveLength(2);
    expect(
      readAttachment(writer.attachments, result.attachments.find((entry) => entry.name === "stdout")!.source),
    ).toBe("test stdout");
    expect(
      readAttachment(
        writer.attachments,
        result.attachments.find((entry) => entry.name === "runtime attachment")!.source,
      ),
    ).toBe("hello");
  });

  it("writes diagnostic events as per-test or global attachments", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/diagnostic.test.mjs"));

    reporter.handleEvent({
      type: "test:diagnostic",
      data: {
        file,
        message: "test diagnostic",
        testId: 15,
      },
    });
    reporter.handleEvent({
      type: "test:diagnostic",
      data: {
        file,
        message: "global diagnostic",
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "emits diagnostics",
        nesting: 0,
        testId: 15,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });

    reporter.finish();

    const result = getTestByName(writer.tests, "emits diagnostics");
    const testDiagnostics = result.attachments.find((entry) => entry.name === "diagnostics");
    const globalDiagnostics = Object.values(writer.globals ?? {})
      .flatMap((entry) => entry.attachments)
      .find((entry) => entry.name === "diagnostics");

    expect(testDiagnostics).toBeDefined();
    expect(globalDiagnostics).toBeDefined();
    expect(readAttachment(writer.attachments, testDiagnostics!.source)).toBe("test diagnostic");
    expect(readAttachment(writer.attachments, globalDiagnostics!.source)).toBe("global diagnostic");
  });

  it("links suite before hook failures to cancelled child tests", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/hooks.test.mjs"));
    const cause = Object.assign(new Error("setup assertion"), {
      name: "AssertionError",
    });

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "Hooked suite",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "Hooked suite",
        nesting: 0,
        details: {
          duration_ms: 2,
          error: {
            cause,
            message: "failed running before hook",
            name: "Error",
            stack: cause.stack,
          },
          type: "suite",
        },
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "child",
        nesting: 1,
        details: {
          duration_ms: 1,
          error: {
            message: "test did not finish before its parent and was cancelled",
            name: "Error",
          },
          type: "test",
        },
      },
    });

    reporter.finish();

    const child = getTestByName(writer.tests, "child");

    expect(child.status).toBe(Status.SKIPPED);
    expect(child.statusDetails.message).toBe("skipped because before hook failed: setup assertion");
    expect(writer.groups).toEqual([
      expect.objectContaining({
        children: [child.uuid],
        befores: [
          expect.objectContaining({
            name: "before hook",
            status: Status.FAILED,
            statusDetails: expect.objectContaining({
              message: "setup assertion",
            }),
          }),
        ],
        afters: [],
      }),
    ]);
    expect(Object.values(writer.globals ?? {}).flatMap((entry) => entry.errors)).toEqual([
      expect.objectContaining({
        message: "before hook in Hooked suite failed: setup assertion",
      }),
    ]);
  });

  it("writes a global error for suite before hook failures without child results", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/empty-hooks.test.mjs"));
    const cause = new Error("setup failed");

    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "Empty suite",
        nesting: 0,
        details: {
          duration_ms: 1,
          error: {
            cause,
            message: "failed running before hook",
            name: "Error",
            stack: cause.stack,
          },
          type: "suite",
        },
      },
    });

    reporter.finish();

    expect(writer.tests).toHaveLength(0);
    expect(writer.groups).toHaveLength(0);
    expect(Object.values(writer.globals ?? {}).flatMap((entry) => entry.errors)).toEqual([
      expect.objectContaining({
        message: "before hook in Empty suite failed: setup failed",
        trace: cause.stack,
      }),
    ]);
  });

  it("links beforeEach hook failures to their tests", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/before-each-hooks.test.mjs"));
    const cause = Object.assign(new Error("before each assertion"), {
      actual: 1,
      expected: 2,
      name: "AssertionError",
    });

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "Before each suite",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "uses beforeEach",
        nesting: 1,
        testNumber: 1,
        details: {
          duration_ms: 1,
          error: {
            cause,
            message: "failed running beforeEach hook",
            name: "Error",
            stack: cause.stack,
          },
          type: "test",
        },
      },
    });

    reporter.finish();

    const result = getTestByName(writer.tests, "uses beforeEach");

    expect(result.status).toBe(Status.FAILED);
    expect(result.statusDetails).toEqual(
      expect.objectContaining({
        actual: "1",
        expected: "2",
        message: "before each assertion",
      }),
    );
    expect(writer.groups).toEqual([
      expect.objectContaining({
        children: [result.uuid],
        befores: [
          expect.objectContaining({
            name: "beforeEach hook",
            status: Status.FAILED,
          }),
        ],
        afters: [],
      }),
    ]);
  });

  it("links afterEach and suite after hook failures to executed tests", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/after-hooks.test.mjs"));
    const afterEachCause = new Error("after each cleanup failed");
    const afterCause = Object.assign(new Error("suite after assertion"), {
      name: "AssertionError",
    });

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "After each suite",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "uses afterEach",
        nesting: 1,
        testNumber: 1,
        details: {
          duration_ms: 1,
          error: {
            cause: afterEachCause,
            message: "failed running afterEach hook",
            name: "Error",
            stack: afterEachCause.stack,
          },
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "After suite",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "passes body",
        nesting: 1,
        testNumber: 1,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "After suite",
        nesting: 0,
        details: {
          duration_ms: 2,
          error: {
            cause: afterCause,
            message: "failed running after hook",
            name: "Error",
            stack: afterCause.stack,
          },
          type: "suite",
        },
      },
    });

    reporter.finish();

    const afterEachResult = getTestByName(writer.tests, "uses afterEach");
    const afterSuiteResult = getTestByName(writer.tests, "passes body");

    expect(afterEachResult.status).toBe(Status.BROKEN);
    expect(afterEachResult.statusDetails.message).toBe("after each cleanup failed");
    expect(afterSuiteResult.status).toBe(Status.FAILED);
    expect(afterSuiteResult.statusDetails.message).toBe("suite after assertion");
    expect(writer.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [afterEachResult.uuid],
          befores: [],
          afters: [
            expect.objectContaining({
              name: "afterEach hook",
              status: Status.BROKEN,
            }),
          ],
        }),
        expect.objectContaining({
          children: [afterSuiteResult.uuid],
          befores: [],
          afters: [
            expect.objectContaining({
              name: "after hook",
              status: Status.FAILED,
            }),
          ],
        }),
      ]),
    );
  });

  it("ignores aggregate suite failures and suppresses hook containers for internally skipped test-plan registrations", () => {
    const { reporter, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/omitted-hooks.test.mjs"));

    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "Aggregate suite",
        nesting: 0,
        details: {
          duration_ms: 1,
          error: {
            cause: "2 subtests failed",
            message: "2 subtests failed",
            name: "Error",
          },
          type: "suite",
        },
      },
    });
    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "not selected @allure.label.ALLURE_TESTPLAN_SKIP:true",
        nesting: 0,
        details: {
          duration_ms: 1,
          error: {
            cause: new Error("before each failed outside plan"),
            message: "failed running beforeEach hook",
            name: "Error",
          },
          type: "test",
        },
      },
    });

    reporter.finish();

    expect(writer.tests).toHaveLength(0);
    expect(writer.groups).toHaveLength(0);
    expect(writer.globals).toBeUndefined();
  });

  it("maps failures, skips, todos and global output", () => {
    const { reporter, writer } = createReporter();
    const file = join(process.cwd(), "test/fixtures/statuses.test.mjs");
    const assertionError = Object.assign(new Error("Expected values to be equal"), {
      actual: 1,
      expected: 2,
      name: "AssertionError",
    });

    reporter.handleEvent({
      type: "test:fail",
      data: {
        file,
        name: "fails",
        nesting: 0,
        details: {
          duration_ms: 1,
          error: {
            cause: assertionError,
            failureType: "testCodeFailure",
            message: assertionError.message,
            name: "Error",
            stack: assertionError.stack,
          },
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "skipped",
        nesting: 0,
        skip: "not today",
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "todo item",
        nesting: 0,
        todo: true,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:stdout",
      data: {
        file,
        message: "global stdout",
      },
    });

    reporter.finish();

    expect(getTestByName(writer.tests, "fails")).toEqual(
      expect.objectContaining({
        status: Status.FAILED,
        statusDetails: expect.objectContaining({
          actual: "1",
          expected: "2",
          message: "Expected values to be equal",
        }),
      }),
    );
    expect(getTestByName(writer.tests, "skipped")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
        statusDetails: { message: "not today" },
      }),
    );
    expect(getTestByName(writer.tests, "todo item")).toEqual(
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.PENDING,
        statusDetails: { message: "TODO" },
      }),
    );
    expect(Object.values(writer.globals ?? {})).toEqual([
      expect.objectContaining({
        attachments: [expect.objectContaining({ name: "stdout" })],
      }),
    ]);
  });

  it("formats title metadata links with configured templates", () => {
    const { reporter, writer } = createReporter({
      links: {
        issue: {
          nameTemplate: "Issue %s",
          urlTemplate: "https://issues.example.test/%s",
        },
      },
    });
    const file = join(process.cwd(), "test/fixtures/links.test.mjs");

    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "links issue @allure.link.issue:AUTH-1",
        nesting: 0,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });

    reporter.finish();

    expect(getTestByName(writer.tests, "links issue").links).toEqual([
      {
        name: "Issue AUTH-1",
        type: "issue",
        url: "https://issues.example.test/AUTH-1",
      },
    ]);
  });

  it("omits internally skipped test-plan registrations but keeps executed tests visible", () => {
    const { reporter, writer } = createReporter();
    const file = join(process.cwd(), "test/fixtures/testplan.test.mjs");

    reporter.handleEvent({
      type: "test:start",
      data: {
        file,
        name: "Checkout",
        nesting: 0,
        type: "suite",
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "selected by id @allure.id:42",
        nesting: 0,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "selected by native name",
        nesting: 1,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "not selected @allure.label.ALLURE_TESTPLAN_SKIP:true",
        skip: true,
        nesting: 0,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });

    reporter.finish();

    expect(writer.tests.map((result) => result.name)).toEqual(["selected by id", "selected by native name"]);
  });

  it("keeps executed runtime metadata tests visible", () => {
    const { reporter, runDir, writer } = createReporter();
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/runtime-testplan.test.mjs"));
    const allureFullName = getAllureFullNameFromParts(file, ["selected by runtime id"]);

    writeRuntimeMessage(runDir, {
      version: 1,
      pid: process.pid,
      testId: 21,
      file,
      nodeFullName: "selected by runtime id",
      allureFullName,
      timestamp: Date.now(),
      message: {
        type: "metadata",
        data: {
          labels: [{ name: LabelName.ALLURE_ID, value: "9000" }],
        },
      },
    });
    reporter.handleEvent({
      type: "test:pass",
      data: {
        file,
        name: "selected by runtime id",
        nesting: 0,
        testId: 21,
        details: {
          duration_ms: 1,
          type: "test",
        },
      },
    });

    reporter.finish();

    expect(writer.tests.map((result) => result.name)).toEqual(["selected by runtime id"]);
    expect(getTestByName(writer.tests, "selected by runtime id").labels).toEqual(
      expect.arrayContaining([{ name: LabelName.ALLURE_ID, value: "9000" }]),
    );
  });
});
