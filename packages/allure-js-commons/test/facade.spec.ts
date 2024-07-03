import { type Mocked, describe, expect, it, vi } from "vitest";
import { logStep } from "../src/facade.js";
import { Status } from "../src/model.js";
import { type TestRuntime } from "../src/sdk/runtime/index.js";

const mockRuntime = (): Mocked<TestRuntime> => {
  return {
    attachment: vi.fn(),
    attachmentFromPath: vi.fn(),
    description: vi.fn(),
    descriptionHtml: vi.fn(),
    displayName: vi.fn(),
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
