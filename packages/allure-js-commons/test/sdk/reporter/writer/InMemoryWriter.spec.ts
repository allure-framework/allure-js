import { describe, expect, it } from "vitest";

import { InMemoryWriter } from "../../../../src/sdk/reporter/writer/InMemoryWriter.js";

describe("InMemoryWriter", () => {
  it("stores performance results by file name", () => {
    const writer = new InMemoryWriter();
    const results = [{ id: "metric-id", key: "report.generate", value: 12.5, start: 100, stop: 112.5 }];

    writer.writeMetricResults("123-metric.json", results);

    expect(writer.metrics).toEqual({
      "123-metric.json": results,
    });
  });
});
