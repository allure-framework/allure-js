import { randomUUID } from "node:crypto";
import { performance, PerformanceObserver, type PerformanceEntry } from "node:perf_hooks";

import type { AllureMetricResult } from "allure-js-commons";
import { getGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

export type StopPerformanceInstrumentation = () => Promise<void>;

let instrumentationActive = false;

const toMetricResult = (entry: PerformanceEntry) => {
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
  if (instrumentationActive) {
    throw new Error(
      "Performance instrumentation is already active. Call the previous stop function before starting again.",
    );
  }

  const entries: PerformanceEntry[] = [];
  let stopped = false;

  const observer = new PerformanceObserver((list) => {
    if (!stopped) {
      entries.push(...list.getEntries());
    }
  });

  observer.observe({ type: "measure" });
  instrumentationActive = true;

  return async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    entries.push(...observer.takeRecords());
    observer.disconnect();
    instrumentationActive = false;

    const results = entries.reduce<AllureMetricResult[]>((acc, entry) => {
      const result = toMetricResult(entry);

      if (result) {
        acc.push(result);
      }

      return acc;
    }, []);

    if (results.length > 0) {
      await getGlobalTestRuntime().metrics(...results);
    }
  };
};
