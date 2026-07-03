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
  { type: "cypress_test_end", data: { duration: 1, retries: 0 } },
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
