import { afterEach, describe, expect, it, vi, type Mocked } from "vitest";

import { label as asyncLabel } from "../src/facade.js";
import { Status } from "../src/model.js";
import {
  MessageHolderTestRuntime,
  MessageTestRuntime,
  setGlobalTestRuntime,
  type SyncTestRuntime,
  type TestRuntime,
} from "../src/sdk/runtime/index.js";
import { NOOP_SYNC_RUNTIME_WARNING, SYNC_STEP_PURE_FUNCTION_ERROR } from "../src/sdk/runtime/NoopTestRuntime.js";
import * as allureSync from "../src/sync.js";

const mockSyncRuntime = (): Mocked<SyncTestRuntime> => {
  return {
    attachment: vi.fn(),
    attachmentFromPath: vi.fn(),
    description: vi.fn(),
    descriptionHtml: vi.fn(),
    displayName: vi.fn(),
    globalAttachment: vi.fn(),
    globalAttachmentFromPath: vi.fn(),
    globalError: vi.fn(),
    historyId: vi.fn(),
    labels: vi.fn(),
    links: vi.fn(),
    logStep: vi.fn(),
    parameter: vi.fn(),
    step: vi.fn((_, body) => body()),
    stepDisplayName: vi.fn(),
    stepParameter: vi.fn(),
    testCaseId: vi.fn(),
  } as Mocked<SyncTestRuntime>;
};

const mockRuntime = (): Mocked<TestRuntime> & { sync: Mocked<SyncTestRuntime> } => {
  const sync = mockSyncRuntime();

  return {
    attachment: vi.fn().mockResolvedValue(undefined),
    attachmentFromPath: vi.fn().mockResolvedValue(undefined),
    description: vi.fn().mockResolvedValue(undefined),
    descriptionHtml: vi.fn().mockResolvedValue(undefined),
    displayName: vi.fn().mockResolvedValue(undefined),
    globalAttachment: vi.fn().mockResolvedValue(undefined),
    globalAttachmentFromPath: vi.fn().mockResolvedValue(undefined),
    globalError: vi.fn().mockResolvedValue(undefined),
    historyId: vi.fn().mockResolvedValue(undefined),
    labels: vi.fn().mockResolvedValue(undefined),
    links: vi.fn().mockResolvedValue(undefined),
    logStep: vi.fn().mockResolvedValue(undefined),
    parameter: vi.fn().mockResolvedValue(undefined),
    step: vi.fn(async (_, body) => await body()),
    stepDisplayName: vi.fn().mockResolvedValue(undefined),
    stepParameter: vi.fn().mockResolvedValue(undefined),
    sync,
    testCaseId: vi.fn().mockResolvedValue(undefined),
  } as Mocked<TestRuntime> & { sync: Mocked<SyncTestRuntime> };
};

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "allureTestRuntime");
});

describe("sync facade", () => {
  it("should use the sync runtime from the same registered runtime object", async () => {
    const runtime = mockRuntime();
    setGlobalTestRuntime(runtime);

    await asyncLabel("async", "one");
    allureSync.label("sync", "two");

    expect(runtime.labels).toHaveBeenCalledWith({ name: "async", value: "one" });
    expect(runtime.sync.labels).toHaveBeenCalledWith({ name: "sync", value: "two" });
  });

  it("should dispatch metadata and global messages", () => {
    const runtime = new MessageHolderTestRuntime();
    setGlobalTestRuntime(runtime);

    allureSync.epic("Authentication");
    allureSync.issue("https://example.test/ISSUE-1", "ISSUE-1");
    allureSync.parameter("browser", "chromium", { excluded: true });
    allureSync.description("markdown");
    allureSync.displayName("custom name");
    allureSync.historyId("history-id");
    allureSync.testCaseId("test-case-id");
    allureSync.globalAttachment("setup.log", "content", "text/plain");
    allureSync.globalAttachmentPath("trace", "/tmp/trace.zip", "application/zip");
    allureSync.globalError({ message: "boom", trace: "stack" });

    expect(runtime.messages()).toEqual(
      expect.arrayContaining([
        {
          type: "metadata",
          data: {
            labels: [{ name: "epic", value: "Authentication" }],
          },
        },
        {
          type: "metadata",
          data: {
            links: [{ url: "https://example.test/ISSUE-1", type: "issue", name: "ISSUE-1" }],
          },
        },
        {
          type: "metadata",
          data: {
            parameters: [{ name: "browser", value: "chromium", excluded: true }],
          },
        },
        {
          type: "metadata",
          data: {
            description: "markdown",
          },
        },
        {
          type: "metadata",
          data: {
            displayName: "custom name",
          },
        },
        {
          type: "metadata",
          data: {
            historyId: "history-id",
          },
        },
        {
          type: "metadata",
          data: {
            testCaseId: "test-case-id",
          },
        },
        {
          type: "global_attachment_content",
          data: {
            name: "setup.log",
            content: Buffer.from("content", "utf-8").toString("base64"),
            encoding: "base64",
            contentType: "text/plain",
            fileExtension: undefined,
          },
        },
        {
          type: "global_attachment_path",
          data: {
            name: "trace",
            path: "/tmp/trace.zip",
            contentType: "application/zip",
            fileExtension: undefined,
          },
        },
        {
          type: "global_error",
          data: {
            message: "boom",
            trace: "stack",
          },
        },
      ]),
    );
  });

  it("should handle sync steps, nested steps, attachments and step metadata", () => {
    const runtime = new MessageHolderTestRuntime();
    setGlobalTestRuntime(runtime);

    const returnValue = allureSync.step("outer", (ctx) => {
      ctx.displayName("renamed outer");
      ctx.parameter("browser", "chromium");
      allureSync.attachment("request", JSON.stringify({ login: "jane" }), {
        contentType: "application/json",
      });

      return allureSync.step("inner", (innerCtx) => {
        innerCtx.displayName("renamed inner");
        return 42;
      });
    });

    expect(returnValue).toBe(42);
    expect(runtime.messages()).toEqual([
      {
        type: "step_start",
        data: expect.objectContaining({
          name: "outer",
        }),
      },
      {
        type: "step_metadata",
        data: {
          name: "renamed outer",
        },
      },
      {
        type: "step_metadata",
        data: {
          parameters: [{ name: "browser", value: "chromium", mode: undefined }],
        },
      },
      {
        type: "attachment_content",
        data: expect.objectContaining({
          name: "request",
          contentType: "application/json",
        }),
      },
      {
        type: "step_start",
        data: expect.objectContaining({
          name: "inner",
        }),
      },
      {
        type: "step_metadata",
        data: {
          name: "renamed inner",
        },
      },
      {
        type: "step_stop",
        data: expect.objectContaining({
          status: Status.PASSED,
        }),
      },
      {
        type: "step_stop",
        data: expect.objectContaining({
          status: Status.PASSED,
        }),
      },
    ]);
  });

  it("should mark assertion-like sync step errors as failed", () => {
    const runtime = new MessageHolderTestRuntime();
    setGlobalTestRuntime(runtime);

    expect(() =>
      allureSync.step("failing", () => {
        const error = new Error("assert mismatch");
        error.name = "AssertionError";
        throw error;
      }),
    ).toThrowError("assert mismatch");

    const stopMessage = runtime
      .messages()
      .filter((message) => message.type === "step_stop")
      .pop();

    expect(stopMessage).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.FAILED,
        statusDetails: expect.objectContaining({
          message: "assert mismatch",
        }),
      }),
    });
  });

  it("should mark unexpected sync step errors as broken", () => {
    const runtime = new MessageHolderTestRuntime();
    setGlobalTestRuntime(runtime);
    const error = new Error("boom");
    error.stack = "Error: boom\n    at user-code.ts:1:1";

    expect(() =>
      allureSync.step("broken", () => {
        throw error;
      }),
    ).toThrowError("boom");

    const stopMessage = runtime
      .messages()
      .filter((message) => message.type === "step_stop")
      .pop();

    expect(stopMessage).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: "boom",
        }),
      }),
    });
  });

  it("should reject promise-like returns from sync steps", () => {
    const runtime = new MessageHolderTestRuntime();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setGlobalTestRuntime(runtime);

    expect(() => allureSync.step("async body", () => Promise.resolve("value"))).toThrowError(
      SYNC_STEP_PURE_FUNCTION_ERROR,
    );

    expect(consoleWarn).toHaveBeenCalledWith(SYNC_STEP_PURE_FUNCTION_ERROR);
    const stopMessage = runtime
      .messages()
      .filter((message) => message.type === "step_stop")
      .pop();

    expect(stopMessage).toEqual({
      type: "step_stop",
      data: expect.objectContaining({
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: SYNC_STEP_PURE_FUNCTION_ERROR,
        }),
      }),
    });
  });

  it("should warn and no-op when sync capability is missing", () => {
    const runtime = new (class extends MessageTestRuntime {
      sendMessage = vi.fn().mockResolvedValue(undefined);
    })();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setGlobalTestRuntime(runtime);

    allureSync.label("foo", "bar");

    expect(runtime.sendMessage).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(NOOP_SYNC_RUNTIME_WARNING);
  });
});
