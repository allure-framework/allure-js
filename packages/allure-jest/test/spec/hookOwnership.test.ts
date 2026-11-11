import type { Circus } from "@jest/types";
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { InMemoryWriter, ReporterRuntime } from "allure-js-commons/sdk/reporter";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { expect, it } from "vitest";

import { createJestEnvironment } from "../../src/environmentFactory.js";

// Circus currently skips each hooks for native concurrent tests. Exercise the
// adapter event contract explicitly, including deferral by a custom environment.
it.each(["hook_success", "hook_failure"] as const)(
  "keeps overlapping each hooks with their owners on %s",
  async (outcome) => {
    let currentTest: Circus.TestEntry | undefined;
    const pendingStarts: (() => void)[] = [];
    class BaseEnvironment {
      global = {
        expect: { getState: () => ({ currentTestIdentity: () => currentTest, suppressedErrors: [] }) },
      };
      declare runtime: ReporterRuntime;
      declare handleAllureRuntimeMessage: (message: RuntimeMessage) => void;

      constructor(_config: unknown, _context: unknown) {}

      handleTestEvent(event: Circus.Event, _state: Circus.State): void | Promise<void> {
        if (event.name === "hook_start") {
          return new Promise((resolve) => pendingStarts.push(resolve));
        }
      }
    }

    const writer = new InMemoryWriter();
    const runtime = getGlobalTestRuntime();
    const Environment = createJestEnvironment(BaseEnvironment);
    const environment = new Environment({ rootDir: "/" }, { testPath: "/sample.test.js" });
    setGlobalTestRuntime(runtime);
    environment.runtime = new ReporterRuntime({ writer });

    const parent = { name: "ROOT_DESCRIBE_BLOCK" } as Circus.DescribeBlock;
    const tests = ["A", "B"].map((name) => ({ name, parent, errors: [], duration: 1 }) as unknown as Circus.TestEntry);
    const state = { currentlyRunningTest: tests[1] } as Circus.State;
    const emit = (event: Circus.Event) => environment.handleTestEvent(event, state);
    await emit({ name: "run_describe_start", describeBlock: parent });
    for (const test of tests) {
      await emit({ name: "test_start", test });
    }

    for (const type of ["beforeEach", "afterEach"] as const) {
      const hook = { type, asyncError: new Error("user hook") } as Circus.Hook;
      currentTest = tests[0];
      const startA = emit({ name: "hook_start", hook });
      currentTest = tests[1];
      const startB = emit({ name: "hook_start", hook });
      // Both callbacks are pending; the shared cursor and identity now point at B.
      expect(pendingStarts).toHaveLength(2);
      pendingStarts.pop()!();
      await startB;
      pendingStarts.pop()!();
      await startA;

      for (const test of tests.toReversed()) {
        currentTest = test;
        environment.handleAllureRuntimeMessage({
          type: "step_start",
          data: { name: `${type} ${test.name}`, start: 1 },
        });
        environment.handleAllureRuntimeMessage({ type: "step_stop", data: { status: Status.PASSED, stop: 2 } });
        if (outcome === "hook_failure") {
          const error = new Error(`${type} ${test.name} failed`);
          test.errors.push(error);
          await emit({ name: outcome, hook, test, error });
        } else {
          await emit({ name: outcome, hook, test });
        }
      }

      if (type === "beforeEach") {
        for (const test of tests) {
          currentTest = test;
          await emit({ name: "test_fn_start", test });
          if (outcome === "hook_success") {
            await emit({ name: "test_fn_success", test });
          }
        }
      }
    }
    for (const test of tests) {
      await emit({ name: "test_done", test });
    }
    await emit({ name: "run_describe_finish", describeBlock: parent });

    expect(writer.tests).toHaveLength(2);
    expect(writer.groups).toHaveLength(4);
    for (const test of writer.tests) {
      expect(test).toMatchObject({
        status: outcome === "hook_failure" ? Status.BROKEN : Status.PASSED,
        stage: Stage.FINISHED,
        steps: [],
      });
      for (const type of ["beforeEach", "afterEach"] as const) {
        const fixtures = type === "beforeEach" ? "befores" : "afters";
        const group = writer.groups.find((result) => result.name === type && result.children.includes(test.uuid));
        expect(group).toMatchObject({
          children: [test.uuid],
          [fixtures]: [
            {
              name: type,
              status: outcome === "hook_failure" ? Status.BROKEN : Status.PASSED,
              stage: Stage.FINISHED,
              stop: expect.any(Number),
              statusDetails:
                outcome === "hook_failure" ? { message: `${type} ${test.name} failed`, trace: expect.any(String) } : {},
              steps: [expect.objectContaining({ name: `${type} ${test.name}`, status: Status.PASSED })],
            },
          ],
        });
      }
    }
  },
);
