import { describe, expect, it, vi } from "vitest";

import { Status } from "../../../src/model.js";
import type { RuntimeMessage } from "../../../src/sdk/index.js";
import { MessageTestRuntime } from "../../../src/sdk/runtime/MessageTestRuntime.js";

const implementMessageTestRuntime = () =>
  new (class extends MessageTestRuntime {
    sendMessage = vi
      .fn<Parameters<MessageTestRuntime["sendMessage"]>, ReturnType<MessageTestRuntime["sendMessage"]>>()
      .mockImplementation(() => Promise.resolve());

    sendMessageSync = vi.fn<[RuntimeMessage], void>().mockImplementation(() => undefined);
  })();

describe("logStep", () => {
  it("should create step with name", async () => {
    const messageTestRuntime = implementMessageTestRuntime();

    await messageTestRuntime.logStep("some step name");

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(2);

    const [[message1], [message2]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message1).toEqual({
      type: "step_start",
      data: expect.objectContaining({
        name: "some step name",
      }),
    });
    expect(message2).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.PASSED,
      }),
    });
  });
  it("should create step with name and status", async () => {
    const messageTestRuntime = implementMessageTestRuntime();
    await messageTestRuntime.logStep("failed step", Status.FAILED);

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(2);

    const [[message1], [message2]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message1).toEqual({
      type: "step_start",
      data: expect.objectContaining({
        name: "failed step",
      }),
    });
    expect(message2).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.FAILED,
      }),
    });
  });
  it("should set correct step timings", async () => {
    const messageTestRuntime = implementMessageTestRuntime();
    const before = Date.now();
    await messageTestRuntime.logStep("broken step", Status.BROKEN);
    const after = Date.now();

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(2);

    const [[message1], [message2]] = messageTestRuntime.sendMessage.mock.calls;
    // @ts-ignore
    expect(message1.data.start).toBeGreaterThanOrEqual(before);
    // @ts-ignore
    expect(message1.data.start).toBeLessThanOrEqual(after);
    // @ts-ignore
    expect(message1.data.start).toEqual(message2.data.stop);
  });
});

describe("stage", () => {
  it("should create stage start message", async () => {
    const messageTestRuntime = implementMessageTestRuntime();

    await messageTestRuntime.stage("prepare data");

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(1);

    const [[message]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message).toEqual({
      type: "stage_start",
      data: expect.objectContaining({
        name: "prepare data",
      }),
    });
  });
});

describe("global methods", () => {
  it("should create global attachment message", async () => {
    const messageTestRuntime = implementMessageTestRuntime();

    await messageTestRuntime.globalAttachment("global log", "content", { contentType: "text/plain" });

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(1);
    const [[message]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message).toEqual({
      type: "global_attachment_content",
      data: {
        name: "global log",
        content: Buffer.from("content", "utf-8").toString("base64"),
        encoding: "base64",
        contentType: "text/plain",
        fileExtension: undefined,
      },
    });
  });

  it("should create global error message", async () => {
    const messageTestRuntime = implementMessageTestRuntime();

    await messageTestRuntime.globalError({ message: "global failed", trace: "stack" });

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(1);
    const [[message]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message).toEqual({
      type: "global_error",
      data: {
        message: "global failed",
        trace: "stack",
      },
    });
  });

  it("should create global attachment path message", async () => {
    const messageTestRuntime = implementMessageTestRuntime();

    await messageTestRuntime.globalAttachmentFromPath("global log", "/tmp/global.log", { contentType: "text/plain" });

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(1);
    const [[message]] = messageTestRuntime.sendMessage.mock.calls;
    expect(message).toEqual({
      type: "global_attachment_path",
      data: {
        name: "global log",
        path: "/tmp/global.log",
        contentType: "text/plain",
        fileExtension: undefined,
      },
    });
  });
});

describe("step", () => {
  it("should not have ansi in error details", async () => {
    const ansiPattern = [
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
    ].join("|");

    const messageTestRuntime = implementMessageTestRuntime();

    const errorMessage =
      "\u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m2\u001b[39m\nReceived: \u001b[31m1\u001b[39m";
    const error = new Error(errorMessage);

    const failingStep = () => {
      throw error;
    };

    await expect(messageTestRuntime.step("failed step", failingStep)).rejects.toThrowError(error);

    expect(messageTestRuntime.sendMessage).toBeCalledTimes(2);

    const [[message1], [message2]] = messageTestRuntime.sendMessage.mock.calls;

    expect(message1).toEqual({
      type: "step_start",
      data: expect.objectContaining({
        name: "failed step",
      }),
    });

    expect(message2).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        statusDetails: expect.objectContaining({
          message: expect.not.stringMatching(ansiPattern),
          trace: expect.not.stringMatching(ansiPattern),
        }),
      }),
    });
  });
});

describe("sync runtime", () => {
  it("should create sync log step messages", () => {
    const messageTestRuntime = implementMessageTestRuntime();

    messageTestRuntime.sync.logStep("sync log step");

    expect(messageTestRuntime.sendMessageSync).toBeCalledTimes(2);

    const [[message1], [message2]] = messageTestRuntime.sendMessageSync.mock.calls;
    expect(message1).toEqual({
      type: "step_start",
      data: expect.objectContaining({
        name: "sync log step",
      }),
    });
    expect(message2).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.PASSED,
      }),
    });
  });

  it("should create sync stage start message", () => {
    const messageTestRuntime = implementMessageTestRuntime();

    messageTestRuntime.sync.stage("sync prepare data");

    expect(messageTestRuntime.sendMessageSync).toBeCalledTimes(1);

    const [[message]] = messageTestRuntime.sendMessageSync.mock.calls;
    expect(message).toEqual({
      type: "stage_start",
      data: expect.objectContaining({
        name: "sync prepare data",
      }),
    });
  });

  it("should create sync attachment message", () => {
    const messageTestRuntime = implementMessageTestRuntime();

    messageTestRuntime.sync.attachment("log.txt", "content", { contentType: "text/plain" });

    expect(messageTestRuntime.sendMessageSync).toBeCalledWith({
      type: "attachment_content",
      data: expect.objectContaining({
        name: "log.txt",
        content: Buffer.from("content", "utf-8").toString("base64"),
        encoding: "base64",
        contentType: "text/plain",
      }),
    });
  });

  it("should create sync global attachment message", () => {
    const messageTestRuntime = implementMessageTestRuntime();

    messageTestRuntime.sync.globalAttachment("global.txt", "content", { contentType: "text/plain" });

    expect(messageTestRuntime.sendMessageSync).toBeCalledWith({
      type: "global_attachment_content",
      data: {
        name: "global.txt",
        content: Buffer.from("content", "utf-8").toString("base64"),
        encoding: "base64",
        contentType: "text/plain",
        fileExtension: undefined,
      },
    });
  });

  it("should create sync step messages and return a value", () => {
    const messageTestRuntime = implementMessageTestRuntime();

    const result = messageTestRuntime.sync.step("sync step", () => {
      messageTestRuntime.sync.stepDisplayName("custom sync step");
      messageTestRuntime.sync.stepParameter("foo", "bar");
      return 42;
    });

    expect(result).toBe(42);
    expect(messageTestRuntime.sendMessageSync.mock.calls).toEqual([
      [
        {
          type: "step_start",
          data: expect.objectContaining({
            name: "sync step",
          }),
        },
      ],
      [
        {
          type: "step_metadata",
          data: {
            name: "custom sync step",
          },
        },
      ],
      [
        {
          type: "step_metadata",
          data: {
            parameters: [{ name: "foo", value: "bar", mode: undefined }],
          },
        },
      ],
      [
        {
          type: "step_stop",
          data: expect.objectContaining({
            status: Status.PASSED,
          }),
        },
      ],
    ]);
  });
});
