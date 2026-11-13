import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { attachmentMock } = vi.hoisted(() => ({
  attachmentMock: vi.fn(),
}));

vi.mock("../../../../src/facade.js", () => ({
  attachment: attachmentMock,
  step: async (_name: string, body: () => Promise<void>) => await body(),
}));

import type { Globals } from "../../../../src/model.js";
import { MessageReader } from "../../../../src/sdk/reporter/writer/MessageReader.js";
import { MessageWriter } from "../../../../src/sdk/reporter/writer/MessageWriter.js";

describe("MessageWriter/MessageReader typed transport", () => {
  beforeEach(() => {
    attachmentMock.mockReset();
  });

  it("reads metric payload from a typed metrics message", () => {
    const bus = new EventEmitter();
    const writer = new MessageWriter(bus);
    const reader = new MessageReader();

    bus.on("allureWriterMessage", (message) => {
      reader.handleMessage(message as string);
    });

    const results = [{ id: "metric-id", key: "report.generate", value: 12.5, start: 100, stop: 112.5 }];

    writer.writeMetricResults("123-metric.json", results);

    expect(reader.results.metrics).toEqual({
      "123-metric.json": results,
    });
  });

  it("attaches metric payloads with the other collected results", async () => {
    const bus = new EventEmitter();
    const writer = new MessageWriter(bus);
    const reader = new MessageReader();

    bus.on("allureWriterMessage", (message) => {
      reader.handleMessage(message as string);
    });

    const results = [{ id: "metric-id", key: "report.generate", value: 12.5, start: 100, stop: 112.5 }];

    writer.writeMetricResults("123-metric.json", results);
    await reader.attachResults();

    expect(attachmentMock).toHaveBeenCalledTimes(1);
    expect(attachmentMock).toHaveBeenCalledWith("123-metric.json", JSON.stringify(results, null, 2), {
      contentType: "application/json",
      encoding: "utf-8",
    });
  });

  it("reads globals payload from typed globals message", () => {
    const bus = new EventEmitter();
    const writer = new MessageWriter(bus);
    const reader = new MessageReader();

    bus.on("allureWriterMessage", (message) => {
      reader.handleMessage(message as string);
    });

    const globals: Globals = {
      attachments: [{ name: "setup-log", source: "setup-log.txt", type: "text/plain", timestamp: 1 }],
      errors: [{ message: "setup failed", trace: "stack", timestamp: 2 }],
    };

    writer.writeGlobals("123-globals.json", globals);

    expect(reader.results.globals).toEqual({
      "123-globals.json": globals,
    });
  });
});
