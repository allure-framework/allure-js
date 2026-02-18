import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import type { Globals } from "../../../../src/model.js";
import { MessageReader } from "../../../../src/sdk/reporter/writer/MessageReader.js";
import { MessageWriter } from "../../../../src/sdk/reporter/writer/MessageWriter.js";

describe("MessageWriter/MessageReader globals transport", () => {
  it("reads globals payload from typed globals message", () => {
    const bus = new EventEmitter();
    const writer = new MessageWriter(bus);
    const reader = new MessageReader();

    bus.on("allureWriterMessage", (message) => {
      reader.handleMessage(message as string);
    });

    const globals: Globals = {
      attachments: [{ name: "setup-log", source: "setup-log.txt", type: "text/plain" }],
      errors: [{ message: "setup failed", trace: "stack" }],
    };

    writer.writeGlobals("123-globals.json", globals);

    expect(reader.results.globals).toEqual({
      "123-globals.json": globals,
    });
  });
});
