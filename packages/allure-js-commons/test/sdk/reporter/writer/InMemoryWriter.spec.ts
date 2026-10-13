import { describe, expect, it } from "vitest";

import { InMemoryWriter } from "../../../../src/sdk/reporter/writer/InMemoryWriter.js";

describe("InMemoryWriter", () => {
  it("stores performance results by file name", () => {
    const writer = new InMemoryWriter();
    const results = [{ id: "metric-id", key: "report.generate", value: 12.5, start: 100, stop: 112.5 }];

    writer.writePerformanceResult("123-perf.json", results);

    expect(writer.performance).toEqual({
      "123-perf.json": results,
    });
  });
});
