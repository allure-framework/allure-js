import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  callback: undefined as undefined | ((list: { getEntries: () => unknown[] }) => void),
  constructed: 0,
  disconnect: vi.fn(),
  observe: vi.fn(),
  performanceMetrics: vi.fn(),
  records: [] as unknown[],
  takeRecords: vi.fn(),
}));

vi.mock("node:perf_hooks", () => ({
  performance: { timeOrigin: 1_000 },
  PerformanceObserver: class {
    constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
      state.constructed += 1;
      state.callback = callback;
    }

    observe = state.observe;
    disconnect = state.disconnect;
    takeRecords = state.takeRecords;
  },
}));

vi.mock("allure-js-commons/sdk/runtime", () => ({
  getGlobalTestRuntime: () => ({ performanceMetrics: state.performanceMetrics }),
}));

import { instrumentPerformance } from "../../src/index.js";

const observersConstructedOnImport = state.constructed;

const entry = (overrides: Partial<{ duration: number; entryType: string; name: string; startTime: number }> = {}) => ({
  duration: 2,
  entryType: "measure",
  name: "valid",
  startTime: 3,
  ...overrides,
});

beforeEach(() => {
  state.callback = undefined;
  state.constructed = 0;
  state.disconnect.mockReset();
  state.observe.mockReset();
  state.performanceMetrics.mockReset();
  state.records = [];
  state.takeRecords.mockReset().mockImplementation(() => state.records.splice(0));
});

describe("observer lifecycle", () => {
  it("performs no observation on import and creates an observer for each sequential instrumentation", async () => {
    expect(observersConstructedOnImport).toBe(0);
    expect(state.constructed).toBe(0);

    const stopFirst = instrumentPerformance();
    await stopFirst();
    const stopSecond = instrumentPerformance();

    expect(state.constructed).toBe(2);
    expect(state.observe).toHaveBeenCalledTimes(2);
    expect(state.observe).toHaveBeenCalledWith({ type: "measure" });

    await stopFirst();
    expect(() => instrumentPerformance()).toThrow("Performance instrumentation is already active");
    await stopSecond();
  });

  it("rejects overlapping instrumentation without creating a second observer or duplicating results", async () => {
    const stop = instrumentPerformance();

    expect(() => instrumentPerformance()).toThrow(
      "Performance instrumentation is already active. Call the previous stop function before starting again.",
    );
    expect(state.constructed).toBe(1);
    state.records.push(entry());
    await stop();

    expect(state.performanceMetrics).toHaveBeenCalledTimes(1);
    expect(state.performanceMetrics.mock.calls[0]).toHaveLength(1);
  });

  it("allows retrying when observation fails to start", async () => {
    const error = new Error("observation failed");
    state.observe.mockImplementationOnce(() => {
      throw error;
    });

    expect(() => instrumentPerformance()).toThrow(error);
    await instrumentPerformance()();
  });

  it("allows a new session while the previous publication is pending", async () => {
    let resolvePublication!: () => void;
    state.performanceMetrics.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolvePublication = resolve;
        }),
    );
    const stopFirst = instrumentPerformance();
    state.records.push(entry());
    const publication = stopFirst();
    const stopSecond = instrumentPerformance();

    await stopFirst();
    expect(() => instrumentPerformance()).toThrow("Performance instrumentation is already active");
    await stopSecond();
    resolvePublication();
    await publication;
  });

  it("collects callback entries and drains pending records before disconnecting", async () => {
    const stop = instrumentPerformance();
    state.callback?.({ getEntries: () => [entry({ name: "callback" })] });
    state.records.push(entry({ name: "pending", startTime: 5, duration: 7 }));

    await stop();

    expect(state.takeRecords).toHaveBeenCalledTimes(1);
    expect(state.disconnect).toHaveBeenCalledTimes(1);
    expect(state.takeRecords.mock.invocationCallOrder[0]).toBeLessThan(state.disconnect.mock.invocationCallOrder[0]);
    expect(state.disconnect.mock.invocationCallOrder[0]).toBeLessThan(
      state.performanceMetrics.mock.invocationCallOrder[0],
    );
    expect(state.performanceMetrics.mock.calls[0]).toEqual([
      expect.objectContaining({ key: "callback" }),
      expect.objectContaining({ key: "pending" }),
    ]);
  });

  it("filters invalid entries and calculated timestamps", async () => {
    const stop = instrumentPerformance();
    state.records.push(
      entry(),
      entry({ entryType: "mark" }),
      entry({ name: "" }),
      entry({ startTime: Number.POSITIVE_INFINITY }),
      entry({ duration: Number.NaN }),
      entry({ duration: -1 }),
      entry({ startTime: Number.MAX_VALUE, duration: Number.MAX_VALUE }),
    );

    await stop();

    expect(state.performanceMetrics).toHaveBeenCalledTimes(1);
    expect(state.performanceMetrics.mock.calls[0]).toEqual([
      expect.objectContaining({ key: "valid", value: 2, start: 1_003, stop: 1_005 }),
    ]);
  });

  it("disconnects before a publication failure is surfaced", async () => {
    const error = new Error("publication failed");
    state.performanceMetrics.mockRejectedValueOnce(error);
    const stop = instrumentPerformance();
    state.records.push(entry());

    await expect(stop()).rejects.toBe(error);

    expect(state.disconnect).toHaveBeenCalledTimes(1);
    await instrumentPerformance()();
  });
});
