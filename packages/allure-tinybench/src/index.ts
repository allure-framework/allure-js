import { randomUUID } from "node:crypto";

import type { AllurePerformanceResult } from "allure-js-commons";
import { getGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { Bench, Task } from "tinybench";

const toPerformanceResult = (task: Task, start: number, stop: number) => {
  const { result } = task;

  if (
    task.name.length === 0 ||
    (result.state !== "completed" && result.state !== "aborted-with-statistics") ||
    !Number.isFinite(result.period)
  ) {
    return undefined;
  }

  return {
    id: randomUUID(),
    key: task.name,
    value: result.period,
    start,
    stop,
  };
};

export const runWithAllure = async (bench: Bench): Promise<Task[]> => {
  const start = Date.now();
  const tasks = await bench.run();
  const stop = Date.now();
  const results = tasks.reduce<AllurePerformanceResult[]>((acc, task) => {
    const result = toPerformanceResult(task, start, stop);

    if (result) {
      acc.push(result);
    }

    return acc;
  }, []);

  if (results.length > 0) {
    await getGlobalTestRuntime().performanceMetrics(...results);
  }

  return tasks;
};
