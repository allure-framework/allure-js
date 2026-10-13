import { MessageHolderTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { Bench } from "tinybench";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { runWithAllure } from "../../src/index.js";

beforeEach(() => {
  vi.stubGlobal("allureTestRuntime", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("sends one batch through the real global runtime", async () => {
  const runtime = new MessageHolderTestRuntime();
  setGlobalTestRuntime(runtime);
  const bench = new Bench({ iterations: 1, time: 0, warmup: false });
  bench.add("first", () => undefined);
  bench.add("second", () => undefined);

  const tasks = await runWithAllure(bench);

  expect(tasks).toHaveLength(2);
  expect(runtime.messages()).toEqual([
    {
      type: "performance_result",
      data: tasks.map((task) => {
        if (task.result.state !== "completed") {
          throw new Error("Expected Tinybench to complete the task");
        }

        return {
          id: expect.any(String),
          key: task.name,
          value: task.result.period,
          start: expect.any(Number),
          stop: expect.any(Number),
        };
      }),
    },
  ]);
});

it("uses the standard no-op behavior when no global runtime is configured", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const bench = new Bench({ iterations: 1, time: 0, warmup: false });
  bench.add("standalone", () => undefined);

  const tasks = await runWithAllure(bench);

  expect(tasks).toHaveLength(1);
  expect(tasks[0].result.state).toBe("completed");
  expect(log).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledWith("no test runtime is found. Please check test framework configuration");
});
