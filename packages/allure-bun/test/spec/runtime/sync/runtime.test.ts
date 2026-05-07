import { describe, expect, it, vi } from "vitest";

import { BunTestRuntime } from "../../../../src/runtime.js";
import type { BunFileContext, BunRunState } from "../../../../src/types.js";

describe("BunTestRuntime sync runtime", () => {
  it("routes rootless sync messages to the run runtime globals", () => {
    const runState = {
      allureRuntime: {
        applyGlobalRuntimeMessages: vi.fn(),
      },
    };
    const runtime = new BunTestRuntime(runState as unknown as BunRunState);

    runtime.sync!.globalError({ message: "rootless problem", trace: "rootless stack" });

    expect(runState.allureRuntime.applyGlobalRuntimeMessages).toHaveBeenCalledWith([
      {
        type: "global_error",
        data: {
          message: "rootless problem",
          trace: "rootless stack",
        },
      },
    ]);
  });

  it("routes sync messages to the active executable", () => {
    const runState = {
      allureRuntime: {
        applyGlobalRuntimeMessages: vi.fn(),
      },
    };
    const fileRuntime = {
      applyGlobalRuntimeMessages: vi.fn(),
      applyRuntimeMessages: vi.fn(),
    };
    const runtime = new BunTestRuntime(runState as unknown as BunRunState);

    runtime.setContext({
      allureRuntime: fileRuntime,
      executables: ["test-uuid"],
    } as unknown as BunFileContext);
    runtime.sync!.labels({ name: "mode", value: "sync" });

    expect(fileRuntime.applyRuntimeMessages).toHaveBeenCalledWith("test-uuid", [
      {
        type: "metadata",
        data: {
          labels: [{ name: "mode", value: "sync" }],
        },
      },
    ]);
    expect(fileRuntime.applyGlobalRuntimeMessages).not.toHaveBeenCalled();
  });
});
