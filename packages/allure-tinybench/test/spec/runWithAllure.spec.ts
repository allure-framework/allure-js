import { Bench, type Task, type TaskResult } from "tinybench";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { performanceMetricsMock } = vi.hoisted(() => ({
  performanceMetricsMock: vi.fn(),
}));

vi.mock("allure-js-commons/sdk/runtime", () => ({
  getGlobalTestRuntime: () => ({ performanceMetrics: performanceMetricsMock }),
}));

import { runWithAllure } from "../../src/index.js";

const task = (name: string, result: TaskResult): Task => ({ name, result }) as unknown as Task;

const result = (state: TaskResult["state"], period?: number): TaskResult =>
  ({ state, ...(period === undefined ? {} : { period }) }) as TaskResult;

const benchReturning = (tasks: Task[]) => {
  const run = vi.fn<Bench["run"]>().mockResolvedValue(tasks);

  return {
    bench: { run } as unknown as Bench,
    run,
  };
};

beforeEach(() => {
  performanceMetricsMock.mockReset();
  vi.restoreAllMocks();
});

describe("runWithAllure", () => {
  it("runs independent benchmarks concurrently without mixing their results", async () => {
    const firstTasks = [task("first", result("completed", 1))];
    const secondTasks = [task("second", result("completed", 2))];
    const first = benchReturning(firstTasks);
    const second = benchReturning(secondTasks);

    const returned = await Promise.all([runWithAllure(first.bench), runWithAllure(second.bench)]);

    expect(returned[0]).toBe(firstTasks);
    expect(returned[1]).toBe(secondTasks);
    expect(first.run).toHaveBeenCalledOnce();
    expect(second.run).toHaveBeenCalledOnce();
    expect(performanceMetricsMock.mock.calls).toEqual([
      [expect.objectContaining({ key: "first", value: 1 })],
      [expect.objectContaining({ key: "second", value: 2 })],
    ]);
  });

  it("runs a real benchmark once and publishes its completed task", async () => {
    const bench = new Bench({ iterations: 1, time: 0, warmup: false });
    const runSpy = vi.spyOn(bench, "run");
    bench.add("aql.parse.simple", () => undefined);

    const tasks = await runWithAllure(bench);

    expect(runSpy).toHaveBeenCalledOnce();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("aql.parse.simple");
    expect(tasks[0].result.state).toBe("completed");

    if (tasks[0].result.state !== "completed") {
      throw new Error("Expected Tinybench to complete the task");
    }

    expect(performanceMetricsMock).toHaveBeenCalledOnce();
    expect(performanceMetricsMock.mock.calls[0]).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        key: "aql.parse.simple",
        value: tasks[0].result.period,
      }),
    ]);
  });

  it("returns the exact task array and uses the complete run timestamps", async () => {
    const tasks = [task("first", result("completed", 1.25)), task("second", result("completed", 2.5))];
    const { bench, run } = benchReturning(tasks);
    vi.spyOn(Date, "now").mockReturnValueOnce(100).mockReturnValueOnce(250);

    const returned = await runWithAllure(bench);

    expect(run).toHaveBeenCalledOnce();
    expect(returned).toBe(tasks);
    expect(performanceMetricsMock.mock.calls[0]).toEqual([
      expect.objectContaining({ key: "first", value: 1.25, start: 100, stop: 250 }),
      expect.objectContaining({ key: "second", value: 2.5, start: 100, stop: 250 }),
    ]);

    const [first, second] = performanceMetricsMock.mock.calls[0];
    expect(first.id).not.toBe("");
    expect(second.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
  });

  it("publishes completed and aborted tasks with statistics while preserving duplicate names", async () => {
    const { bench } = benchReturning([
      task("duplicate", result("completed", 1)),
      task("duplicate", result("aborted-with-statistics", 2)),
    ]);

    await runWithAllure(bench);

    expect(performanceMetricsMock.mock.calls[0]).toEqual([
      expect.objectContaining({ key: "duplicate", value: 1 }),
      expect.objectContaining({ key: "duplicate", value: 2 }),
    ]);
  });

  it("filters tasks without usable completed statistics", async () => {
    const { bench } = benchReturning([
      task("errored", result("errored")),
      task("not-started", result("not-started")),
      task("started", result("started")),
      task("aborted", result("aborted")),
      task("", result("completed", 1)),
      task("nan", result("completed", Number.NaN)),
      task("infinity", result("aborted-with-statistics", Number.POSITIVE_INFINITY)),
      task("valid", result("completed", 3.5)),
    ]);

    await runWithAllure(bench);

    expect(performanceMetricsMock).toHaveBeenCalledOnce();
    expect(performanceMetricsMock.mock.calls[0]).toEqual([expect.objectContaining({ key: "valid", value: 3.5 })]);
  });

  it("does not publish an empty batch", async () => {
    const { bench } = benchReturning([task("aborted", result("aborted"))]);

    await runWithAllure(bench);

    expect(performanceMetricsMock).not.toHaveBeenCalled();
  });

  it("preserves a benchmark error and does not publish partial results", async () => {
    const error = new Error("benchmark failed");
    const run = vi.fn<Bench["run"]>().mockRejectedValue(error);
    const bench = { run } as unknown as Bench;
    performanceMetricsMock.mockRejectedValueOnce(new Error("publication failed"));

    await expect(runWithAllure(bench)).rejects.toBe(error);

    expect(run).toHaveBeenCalledOnce();
    expect(performanceMetricsMock).not.toHaveBeenCalled();
  });

  it("propagates a publication error after a successful benchmark", async () => {
    const error = new Error("publication failed");
    const tasks = [task("completed", result("completed", 1))];
    const { bench } = benchReturning(tasks);
    performanceMetricsMock.mockRejectedValueOnce(error);

    await expect(runWithAllure(bench)).rejects.toBe(error);

    expect(performanceMetricsMock).toHaveBeenCalledOnce();
  });
});
