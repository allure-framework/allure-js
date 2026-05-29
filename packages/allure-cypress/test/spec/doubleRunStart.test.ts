import { Stage, Status } from "allure-js-commons";
import { InMemoryWriter, ReporterRuntime } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { AllureCypress } from "../../src/reporter.js";
import type { AllureCypressTaskArgs, CypressMessage } from "../../src/types.js";

const SPEC_PATH = "/cypress/e2e/sample.cy.js";

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

const sendMessages = (
  tasks: Record<string, (args: AllureCypressTaskArgs) => null>,
  messages: CypressMessage[],
  { isFinal = false } = {},
) => {
  const args: AllureCypressTaskArgs = { absolutePath: SPEC_PATH, messages, isInteractive: false };
  if (isFinal) {
    tasks.reportFinalAllureCypressSpecMessages(args);
  } else {
    tasks.reportAllureCypressSpecMessages(args);
  }
};

const makeRunMessages = (): CypressMessage[] => [
  { type: "cypress_run_start", data: {} },
  { type: "cypress_suite_start", data: { id: "root", name: "", root: true, start: 0 } },
  { type: "cypress_suite_start", data: { id: "s1", name: "Suite", root: false, start: 0 } },
];

const makeTestMessages = (name: string): CypressMessage[] => [
  { type: "cypress_test_start", data: { name, fullNameSuffix: name, start: 0, labels: [] } },
  { type: "cypress_test_pass", data: {} },
  { type: "cypress_test_end", data: { duration: 1, retries: 0 } },
];

const makeEndMessages = (): CypressMessage[] => [
  { type: "cypress_suite_end", data: { root: false, stop: 1 } },
  { type: "cypress_suite_end", data: { root: true, stop: 1 } },
];

it("preserves spec context when cypress_run_start is received a second time", () => {
  const { reporter } = makeReporter();
  const tasks = captureTaskHandlers(reporter);

  sendMessages(tasks, makeRunMessages());

  const contextAfterFirstStart = reporter.specContextByAbsolutePath.get(SPEC_PATH);
  expect(contextAfterFirstStart).toBeDefined();

  // Simulate a second cypress_run_start for the same spec (e.g. from a cross-origin cy.visit
  // causing the browser-side support code to re-initialise mid-run).
  sendMessages(tasks, [{ type: "cypress_run_start", data: {} }]);

  const contextAfterSecondStart = reporter.specContextByAbsolutePath.get(SPEC_PATH);
  expect(contextAfterSecondStart).toBe(contextAfterFirstStart);
});

it("produces exactly the expected test results when cypress_run_start is duplicated mid-run", () => {
  const { reporter, writer } = makeReporter();
  const tasks = captureTaskHandlers(reporter);

  // Batch 1: run starts, first test runs and completes.
  sendMessages(tasks, [...makeRunMessages(), ...makeTestMessages("test one")]);

  // Batch 2: spurious second cypress_run_start (cross-origin scenario), then second test.
  sendMessages(tasks, [{ type: "cypress_run_start", data: {} }, ...makeTestMessages("test two"), ...makeEndMessages()]);

  // Finalise (non-interactive: endSpec is called via after:spec, simulate it directly).
  reporter.endSpec(SPEC_PATH);

  expect(writer.tests).toHaveLength(2);
  for (const test of writer.tests) {
    expect(test.status).toBe(Status.PASSED);
    expect(test.stage).toBe(Stage.FINISHED);
  }
  expect(writer.tests.map((t) => t.name)).toEqual(expect.arrayContaining(["test one", "test two"]));
});
