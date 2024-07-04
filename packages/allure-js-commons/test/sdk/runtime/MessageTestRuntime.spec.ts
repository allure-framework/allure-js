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
