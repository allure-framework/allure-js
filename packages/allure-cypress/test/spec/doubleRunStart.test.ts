import { Stage, Status } from "allure-js-commons";
import { InMemoryWriter, ReporterRuntime } from "allure-js-commons/sdk/reporter";
import { describe, expect, it, vi } from "vitest";

vi.mock("allure-js-commons/sdk/reporter", async (importOriginal) => {
  const mod = await importOriginal<typeof import("allure-js-commons/sdk/reporter")>();
  return {
    ...mod,
    getProjectName: vi.fn(() => undefined),
    getProjectRoot: vi.fn(() => "/"),
    getRelativePath: vi.fn((p: string) => p),
    getPosixPath: vi.fn((p: string) => p.replace(/\\/g, "/")),
    getEnvironmentLabels: vi.fn(() => []),
    getFallbackTestCaseIdLabel: vi.fn(() => ({ name: "ALLURE_ID", value: "0" })),
    getFrameworkLabel: vi.fn(() => ({ name: "framework", value: "cypress" })),
    getHostLabel: vi.fn(() => ({ name: "host", value: "localhost" })),
    getLanguageLabel: vi.fn(() => ({ name: "language", value: "javascript" })),
    getPackageLabel: vi.fn(() => ({ name: "package", value: "spec" })),
    getSuiteLabels: vi.fn(() => []),
    getThreadLabel: vi.fn(() => ({ name: "thread", value: "0" })),
  };
});

import { AllureCypress } from "../../src/reporter.js";
import type { AllureCypressTaskArgs, CypressMessage } from "../../src/types.js";

const SPEC_A = "/cypress/e2e/spec-a.cy.js";
const SPEC_B = "/cypress/e2e/spec-b.cy.js";

const makeReporter = () => {
  const writer = new InMemoryWriter();
  const reporter = new AllureCypress({});
  reporter.allureRuntime = new ReporterRuntime({ writer });
  return { reporter, writer };
};

const captureTaskHandlers = (reporter: AllureCypress) => {
  const tasks: Record<string, (args: AllureCypressTaskArgs) => null> = {};
  reporter.attachToCypress(((event: string, handlers: Record<string, (args: AllureCypressTaskArgs) => null>) => {
    if (event === "task") {
      Object.assign(tasks, handlers);
    }
  }) as any);
  return tasks;
};

type SendOptions = { specPath?: string; isInteractive?: boolean; isFinal?: boolean };

const send = (
  tasks: Record<string, (args: AllureCypressTaskArgs) => null>,
  messages: CypressMessage[],
  { specPath = SPEC_A, isInteractive = false, isFinal = false }: SendOptions = {},
) => {
  const args: AllureCypressTaskArgs = { absolutePath: specPath, messages, isInteractive };
  if (isFinal) {
    tasks.reportFinalAllureCypressSpecMessages(args);
  } else {
    tasks.reportAllureCypressSpecMessages(args);
  }
};

const runStart = (): CypressMessage => ({ type: "cypress_run_start", data: {} });

const suiteStart = (id: string, name = "Suite", root = false): CypressMessage => ({
  type: "cypress_suite_start",
  data: { id, name, root, start: 0 },
});

const suiteEnd = (root = false): CypressMessage => ({
  type: "cypress_suite_end",
  data: { root, stop: 1 },
});

const testLifecycle = (name: string): CypressMessage[] => [
  { type: "cypress_test_start", data: { name, fullNameSuffix: name, start: 0, labels: [] } },
  { type: "cypress_test_pass", data: {} },
  { type: "cypress_test_end", data: { duration: 1, retry: 0 } },
];

describe("duplicate cypress_run_start — context identity", () => {
  it("preserves the same context object when a second cypress_run_start arrives", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    const first = reporter.specContextByAbsolutePath.get(SPEC_A);
    expect(first).toBeDefined();

    send(tasks, [runStart()]);
    expect(reporter.specContextByAbsolutePath.get(SPEC_A)).toBe(first);
  });

  it("is idempotent across many duplicates", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    const first = reporter.specContextByAbsolutePath.get(SPEC_A);

    for (let i = 0; i < 5; i++) {
      send(tasks, [runStart()]);
    }

    expect(reporter.specContextByAbsolutePath.get(SPEC_A)).toBe(first);
  });

  it("preserves the videoScope created at first initialisation", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    const videoScopeBefore = reporter.specContextByAbsolutePath.get(SPEC_A)!.videoScope;

    send(tasks, [runStart()]);
    expect(reporter.specContextByAbsolutePath.get(SPEC_A)!.videoScope).toBe(videoScopeBefore);
  });

  it("preserves accumulated suite scopes across a duplicate", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), suiteStart("s1")]);
    const scopesBefore = reporter.specContextByAbsolutePath.get(SPEC_A)!.suiteScopes.length;
    expect(scopesBefore).toBeGreaterThan(0);

    send(tasks, [runStart()]);
    expect(reporter.specContextByAbsolutePath.get(SPEC_A)!.suiteScopes.length).toBe(scopesBefore);
  });

  it("messages in the same batch after a mid-batch duplicate still apply to the live context", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true)]);
    const ctx = reporter.specContextByAbsolutePath.get(SPEC_A)!;
    const suiteCountBefore = ctx.suiteScopes.length;

    send(tasks, [runStart(), suiteStart("s1"), suiteStart("s2")]);

    expect(reporter.specContextByAbsolutePath.get(SPEC_A)).toBe(ctx);
    expect(ctx.suiteScopes.length).toBe(suiteCountBefore + 2);
  });
});

describe("duplicate cypress_run_start — test results", () => {
  it("produces exactly the expected results when cypress_run_start fires twice", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), suiteStart("s1"), ...testLifecycle("test one")]);
    send(tasks, [runStart(), ...testLifecycle("test two"), suiteEnd(), suiteEnd(true)]);

    reporter.endSpec(SPEC_A);

    expect(writer.tests).toHaveLength(2);
    expect(writer.tests.map((t) => t.name)).toEqual(expect.arrayContaining(["test one", "test two"]));
    for (const t of writer.tests) {
      expect(t.status).toBe(Status.PASSED);
      expect(t.stage).toBe(Stage.FINISHED);
    }
  });

  it("does not create phantom pending results when cypress_run_start is duplicated", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), suiteStart("s1"), ...testLifecycle("only test")]);
    send(tasks, [runStart(), suiteEnd(), suiteEnd(true)]);

    reporter.endSpec(SPEC_A);

    expect(writer.tests).toHaveLength(1);
    expect(writer.tests[0].status).toBe(Status.PASSED);
    expect(writer.tests[0].stage).toBe(Stage.FINISHED);
  });
});

describe("spec path isolation", () => {
  it("a duplicate cypress_run_start for spec A does not affect spec B", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()], { specPath: SPEC_A });
    send(tasks, [runStart()], { specPath: SPEC_B });

    const ctxA = reporter.specContextByAbsolutePath.get(SPEC_A);
    const ctxB = reporter.specContextByAbsolutePath.get(SPEC_B);

    expect(ctxA).toBeDefined();
    expect(ctxB).toBeDefined();
    expect(ctxA).not.toBe(ctxB);

    send(tasks, [runStart()], { specPath: SPEC_A });
    expect(reporter.specContextByAbsolutePath.get(SPEC_B)).toBe(ctxB);
  });
});

describe("reportFinalAllureCypressSpecMessages", () => {
  it("does not end the spec in non-interactive mode even after a duplicate run start", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    send(tasks, [runStart(), suiteEnd(true)], { isFinal: true, isInteractive: false });

    expect(reporter.specContextByAbsolutePath.has(SPEC_A)).toBe(true);
  });

  it("ends the spec in interactive mode even after a duplicate run start", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), suiteEnd(true)]);
    send(tasks, [runStart()], { isFinal: true, isInteractive: true });

    expect(reporter.specContextByAbsolutePath.has(SPEC_A)).toBe(false);
  });
});

describe("interactive re-run", () => {
  it("creates a fresh context after the previous spec has been ended", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    reporter.endSpec(SPEC_A);
    expect(reporter.specContextByAbsolutePath.has(SPEC_A)).toBe(false);

    send(tasks, [runStart()]);
    expect(reporter.specContextByAbsolutePath.get(SPEC_A)).toBeDefined();
  });

  it("creates a new videoScope on re-run", () => {
    const { reporter } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart()]);
    const videoScopeFirst = reporter.specContextByAbsolutePath.get(SPEC_A)!.videoScope;
    reporter.endSpec(SPEC_A);

    send(tasks, [runStart()]);
    const videoScopeSecond = reporter.specContextByAbsolutePath.get(SPEC_A)!.videoScope;

    expect(videoScopeSecond).not.toBe(videoScopeFirst);
  });
});

describe("page reload (a test that needs a different origin)", () => {
  // Cypress reloads the page when a test needs a different origin to the previous one (e.g. each test in a loop has
  // its own baseUrl). The run starts again, the suites that are still open start again, and every test that already
  // ran is skipped.
  const replayedTest = (name: string): CypressMessage[] => [
    { type: "cypress_test_start", data: { name, fullNameSuffix: name, start: 0, labels: [] } },
    { type: "cypress_test_skip", data: { statusDetails: { message: "This is a pending test" } } },
    { type: "cypress_test_end", data: { duration: 0, retry: 0 } },
  ];

  const failedAttempt = (name: string, retry: number): CypressMessage[] => [
    { type: "cypress_test_start", data: { name, fullNameSuffix: name, start: retry, labels: [] } },
    { type: "cypress_fail", data: { status: Status.FAILED, statusDetails: { message: "failed" } } },
    { type: "cypress_test_end", data: { duration: 1, retry } },
  ];

  const results = (writer: InMemoryWriter) =>
    writer.tests.map((t) => ({ name: t.name, status: t.status, suites: t.titlePath?.slice(SPEC_A.split("/").length) }));

  it("doesn't report the tests that already ran again, or start the suites that are still open again", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), suiteStart("s1", "Sites"), ...testLifecycle("site 1")]);
    // the page reloads for "site 2"
    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      suiteStart("s1", "Sites"),
      ...replayedTest("site 1"),
      ...testLifecycle("site 2"),
    ]);
    // and again for "site 3"
    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      suiteStart("s1", "Sites"),
      ...replayedTest("site 1"),
      ...replayedTest("site 2"),
      ...testLifecycle("site 3"),
      suiteEnd(),
      suiteEnd(true),
    ]);

    reporter.endSpec(SPEC_A);

    expect(results(writer)).toEqual([
      { name: "site 1", status: Status.PASSED, suites: ["Sites"] },
      { name: "site 2", status: Status.PASSED, suites: ["Sites"] },
      { name: "site 3", status: Status.PASSED, suites: ["Sites"] },
    ]);
  });

  it("restarts the suites that had ended before the page reloaded, for the tests they replay", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      suiteStart("s1", "First"),
      ...testLifecycle("in first"),
      suiteEnd(),
      suiteStart("s2", "Second"),
      ...testLifecycle("in second"),
    ]);
    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      suiteStart("s1", "First"),
      ...replayedTest("in first"),
      suiteEnd(),
      suiteStart("s2", "Second"),
      ...replayedTest("in second"),
      ...testLifecycle("also in second"),
      suiteEnd(),
      suiteEnd(true),
    ]);

    reporter.endSpec(SPEC_A);

    expect(results(writer)).toEqual([
      { name: "in first", status: Status.PASSED, suites: ["First"] },
      { name: "in second", status: Status.PASSED, suites: ["Second"] },
      { name: "also in second", status: Status.PASSED, suites: ["Second"] },
    ]);
  });

  it("still reports every attempt of a test that's retried after the page reloaded", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    send(tasks, [runStart(), suiteStart("root", "", true), ...testLifecycle("before reload")]);
    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      ...replayedTest("before reload"),
      ...failedAttempt("retried", 0),
      { type: "cypress_test_start", data: { name: "retried", fullNameSuffix: "retried", start: 1, labels: [] } },
      { type: "cypress_test_pass", data: {} },
      { type: "cypress_test_end", data: { duration: 1, retry: 1 } },
      suiteEnd(true),
    ]);

    reporter.endSpec(SPEC_A);

    expect(writer.tests.map((t) => [t.name, t.status])).toEqual([
      ["before reload", Status.PASSED],
      ["retried", Status.FAILED],
      ["retried", Status.PASSED],
    ]);
  });

  it("doesn't report a test skipped because of a hook error again", () => {
    const { reporter, writer } = makeReporter();
    const tasks = captureTaskHandlers(reporter);

    const skippedByHook: CypressMessage = {
      type: "cypress_skipped_test",
      data: {
        name: "skipped",
        fullNameSuffix: "skipped",
        start: 0,
        labels: [],
        status: Status.SKIPPED,
        statusDetails: { message: "skipped" },
        duration: 0,
        retry: 0,
        suites: ["root"],
      },
    };

    send(tasks, [runStart(), suiteStart("root", "", true), skippedByHook]);
    send(tasks, [
      runStart(),
      suiteStart("root", "", true),
      skippedByHook,
      ...testLifecycle("after reload"),
      suiteEnd(true),
    ]);

    reporter.endSpec(SPEC_A);

    expect(writer.tests.map((t) => [t.name, t.status])).toEqual([
      ["skipped", Status.SKIPPED],
      ["after reload", Status.PASSED],
    ]);
  });
});
