import { performance } from "node:perf_hooks";

import { afterEach, describe, expect, it, vi } from "vitest";

const { performanceMetricsMock } = vi.hoisted(() => ({
  performanceMetricsMock: vi.fn(),
}));

vi.mock("allure-js-commons", () => ({
  performanceMetrics: performanceMetricsMock,
}));

import { instrumentPerformance } from "../../src/index.js";

afterEach(() => {
  performance.clearMarks();
  performance.clearMeasures();
  performanceMetricsMock.mockReset();
});

describe("instrumentPerformance", () => {
  it("reports only measures created after instrumentation starts", async () => {
    performance.measure("before", { start: 1, duration: 2 });
    const stop = instrumentPerformance();
    const startTime = performance.now();

    performance.mark("ignored-mark");
    performance.measure("report.generate", { start: startTime, duration: 12.5 });
    await stop();

    expect(performanceMetricsMock).toHaveBeenCalledTimes(1);
    const [result] = performanceMetricsMock.mock.calls[0];
    expect(result).toEqual({
      id: expect.any(String),
      key: "report.generate",
      value: 12.5,
      start: performance.timeOrigin + startTime,
      stop: performance.timeOrigin + startTime + 12.5,
    });
    expect(result.id).not.toBe("");
  });

  it("keeps repeated measure names as separate results", async () => {
    const stop = instrumentPerformance();

    performance.measure("duplicate", { start: 1, duration: 2 });
    performance.measure("duplicate", { start: 3, duration: 4 });
    await stop();

    expect(performanceMetricsMock).toHaveBeenCalledTimes(1);
    expect(performanceMetricsMock.mock.calls[0]).toEqual([
      expect.objectContaining({ key: "duplicate", value: 2 }),
      expect.objectContaining({ key: "duplicate", value: 4 }),
    ]);
  });

  it("does not publish an empty batch", async () => {
    const stop = instrumentPerformance();

    performance.mark("mark-only");
    await stop();

    expect(performanceMetricsMock).not.toHaveBeenCalled();
  });

  it("stops and publishes only once", async () => {
    const stop = instrumentPerformance();

    performance.measure("one", { start: 1, duration: 2 });
    await Promise.all([stop(), stop()]);
    performance.measure("two", { start: 3, duration: 4 });
    await stop();

    expect(performanceMetricsMock).toHaveBeenCalledTimes(1);
    expect(performanceMetricsMock.mock.calls[0]).toEqual([expect.objectContaining({ key: "one" })]);
  });

  it("does not retry a failed publication", async () => {
    const publicationError = new Error("publication failed");
    performanceMetricsMock.mockRejectedValueOnce(publicationError);
    const stop = instrumentPerformance();

    performance.measure("one", { start: 1, duration: 2 });

    await expect(stop()).rejects.toBe(publicationError);
    await expect(stop()).resolves.toBeUndefined();
    expect(performanceMetricsMock).toHaveBeenCalledTimes(1);
  });
});
