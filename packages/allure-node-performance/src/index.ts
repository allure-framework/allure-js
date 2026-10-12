import { randomUUID } from "node:crypto";
import { performance, PerformanceObserver, type PerformanceEntry } from "node:perf_hooks";

import { type AllurePerformanceResult, performanceMetrics } from "allure-js-commons";

export type StopPerformanceInstrumentation = () => Promise<void>;

const toPerformanceResult = (entry: PerformanceEntry) => {
  if (
    entry.entryType !== "measure" ||
    entry.name.length === 0 ||
    !Number.isFinite(entry.startTime) ||
    !Number.isFinite(entry.duration) ||
    entry.duration < 0
  ) {
    return undefined;
  }

  const start = performance.timeOrigin + entry.startTime;
  const stop = start + entry.duration;

  if (!Number.isFinite(start) || !Number.isFinite(stop)) {
    return undefined;
  }

  return {
    id: randomUUID(),
    key: entry.name,
    value: entry.duration,
    start,
    stop,
  };
};

export const instrumentPerformance = (): StopPerformanceInstrumentation => {
  const entries: PerformanceEntry[] = [];
  let stopped = false;

  const observer = new PerformanceObserver((list) => {
    if (!stopped) {
      entries.push(...list.getEntries());
    }
  });

  observer.observe({ type: "measure" });

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    entries.push(...observer.takeRecords());
    observer.disconnect();

    const results = entries.reduce<AllurePerformanceResult[]>((acc, entry) => {
      const result = toPerformanceResult(entry);

      if (result) {
        acc.push(result);
      }

      return acc;
    }, []);

    if (results.length > 0) {
      await performanceMetrics(...results);
    }
  };
};
