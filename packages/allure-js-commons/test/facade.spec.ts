import { type Mocked, describe, expect, it, vi } from "vitest";
import { globalAttachment, globalAttachmentPath, globalError, logStep } from "../src/facade.js";
import { Status } from "../src/model.js";
import { type TestRuntime } from "../src/sdk/runtime/index.js";

const mockRuntime = (): Mocked<TestRuntime> => {
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
    step: vi.fn(),
    stepDisplayName: vi.fn(),
    stepParameter: vi.fn(),
    testCaseId: vi.fn(),
  } as Mocked<TestRuntime>;
};

describe("logStep", () => {
  it("should log step", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await logStep("log step");

    const [name, status, error] = runtime.logStep.mock.calls[0];
    expect(name).toEqual("log step");
    expect(status).toBeUndefined();
    expect(error).toBeUndefined();
  });
  it("should log step with status", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await logStep("passed step", Status.PASSED);

    const [name, status, error] = runtime.logStep.mock.calls[0];
    expect(name).toEqual("passed step");
    expect(status).toEqual(Status.PASSED);
    expect(error).toBeUndefined();
  });
  it("should log step with status failed", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await logStep("failed step", Status.FAILED);

    const [name, status, error] = runtime.logStep.mock.calls[0];
    expect(name).toEqual("failed step");
    expect(status).toEqual(Status.FAILED);
    expect(error).toBeUndefined();
  });
  it("should log step with error", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    const err = new Error("some error");
    await logStep("failed step", Status.FAILED, err);

    const [name, status, error] = runtime.logStep.mock.calls[0];
    expect(name).toEqual("failed step");
    expect(status).toEqual(Status.FAILED);
    expect(error).toEqual(err);
  });
});

describe("global runtime methods", () => {
  it("should add global attachment", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await globalAttachment("setup.log", "content", "text/plain");

    expect(runtime.globalAttachment).toHaveBeenCalledWith("setup.log", "content", { contentType: "text/plain" });
  });

  it("should add global error", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await globalError({ message: "boom", trace: "stack" });

    expect(runtime.globalError).toHaveBeenCalledWith({ message: "boom", trace: "stack" });
  });

  it("should add global attachment from path", async () => {
    const runtime = mockRuntime();
    vi.stubGlobal("allureTestRuntime", () => runtime);

    await globalAttachmentPath("setup.log", "/tmp/setup.log", "text/plain");

    expect(runtime.globalAttachmentFromPath).toHaveBeenCalledWith("setup.log", "/tmp/setup.log", {
      contentType: "text/plain",
    });
  });
});
