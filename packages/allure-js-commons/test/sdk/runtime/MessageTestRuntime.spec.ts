import { describe, expect, it, vi } from "vitest";
import { Status } from "../../../src/model.js";
import { MessageTestRuntime } from "../../../src/sdk/runtime/MessageTestRuntime.js";

const implementMessageTestRuntime = () =>
  new (class extends MessageTestRuntime {
    sendMessage = vi
      .fn<Parameters<MessageTestRuntime["sendMessage"]>, ReturnType<MessageTestRuntime["sendMessage"]>>()
      .mockImplementation(() => Promise.resolve());
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
    expect(message1.data.start).toBeGreaterThanOrEqual(before);
    expect(message1.data.start).toBeLessThanOrEqual(after);
    expect(message1.data.start).toEqual(message2.data.stop);
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
