import { AssertionError } from "node:assert";

import { afterEach, describe, expect, it, vi } from "vitest";

import { globalError } from "../src/facade.js";
import { Status } from "../src/model.js";
import { MessageHolderTestRuntime, setGlobalTestRuntime } from "../src/sdk/runtime/index.js";
import { getGlobalErrorDetails, toGlobalErrorMessage } from "../src/sdk/utils.js";
import { globalError as globalErrorSync } from "../src/syncFacade.js";

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "allureTestRuntime");
});

describe("global error normalization", () => {
  it("infers status from the original error and preserves non-enumerable properties", () => {
    const error = new AssertionError({ message: "mismatch", actual: 0, expected: false });
    error.stack = "assertion stack";
    Object.freeze(error);

    expect(JSON.parse(JSON.stringify(getGlobalErrorDetails(error)))).toEqual({
      status: Status.FAILED,
      message: "mismatch",
      trace: "assertion stack",
      actual: "0",
      expected: "false",
    });
  });

  it.each([Status.FAILED, Status.BROKEN])("gives explicit %s status precedence", (status) => {
    const error = new Error("assert mismatch");

    Object.assign(error, { actual: 1, expected: 2 });
    expect(getGlobalErrorDetails(status, error).status).toBe(status);
    expect(getGlobalErrorDetails(status, new Error("connection lost")).status).toBe(status);
  });

  it("preserves supplied details, including empty strings", () => {
    const details = Object.freeze({ message: "", trace: "", actual: "", expected: "value" });
    expect(getGlobalErrorDetails(details)).toEqual({ ...details, status: Status.FAILED });
  });

  it("prefers trace over stack and strips ANSI formatting", () => {
    const error = new Error("\u001b[31mboom\u001b[0m");

    Object.assign(error, {
      trace: "\u001b[31mcustom trace\u001b[0m",
    });
    expect(getGlobalErrorDetails(error)).toEqual({
      status: Status.BROKEN,
      message: "boom",
      trace: "custom trace",
    });
  });

  it.each([0, false, null, "", { value: 1 }])("serializes comparison value %j", (value) => {
    const error = new Error("mismatch");
    const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);

    Object.assign(error, { actual: value, expected: value });
    expect(getGlobalErrorDetails(error)).toMatchObject({ actual: serialized, expected: serialized });
  });

  it("extracts Jest matcher values and ignores missing values", () => {
    const error = new Error("mismatch");

    Object.assign(error, {
      matcherResult: { actual: { value: 1 }, expected: undefined },
    });
    const details = getGlobalErrorDetails(error);
    expect(details).toMatchObject({ status: Status.FAILED, actual: '{"value":1}' });
    expect(details).not.toHaveProperty("expected");
  });

  it("falls back to direct comparison values when matcherResult is null", () => {
    const error = new Error("mismatch");

    Object.assign(error, { matcherResult: null, actual: null });
    expect(getGlobalErrorDetails(error)).toMatchObject({ actual: "null" });
  });

  it.each([Status.FAILED, Status.BROKEN])("accepts status-only %s calls", (status) => {
    expect(JSON.parse(JSON.stringify(getGlobalErrorDetails(status)))).toEqual({ status });
  });
});

describe("global error messages", () => {
  it("prefixes the error details with the failing operation", () => {
    expect(
      toGlobalErrorMessage({
        name: "beforeAll hook",
        details: { message: "connection lost", trace: "stack" },
        status: Status.FAILED,
      }),
    ).toEqual({
      type: "global_error",
      data: {
        message: "beforeAll hook failed: connection lost",
        trace: "stack",
        status: Status.FAILED,
      },
    });
  });

  it("falls back to a broken status and a generic message", () => {
    expect(toGlobalErrorMessage({ name: "setup", details: {}, status: Status.PASSED })).toEqual({
      type: "global_error",
      data: {
        message: "setup failed",
        status: Status.BROKEN,
      },
    });
  });
});

describe.each(["async facade", "sync facade", "async runtime", "sync runtime"])("%s", (path) => {
  it("emits enriched errors without changing the original input", async () => {
    const runtime = new MessageHolderTestRuntime();
    setGlobalTestRuntime(runtime);
    const report =
      path === "async facade"
        ? globalError
        : path === "sync facade"
          ? globalErrorSync
          : path === "async runtime"
            ? runtime.globalError.bind(runtime)
            : runtime.sync!.globalError;
    const error = new Error("boom");

    Object.assign(error, { stack: "stack", actual: 0, expected: false });
    Object.freeze(error);
    await report(Status.BROKEN, error);
    await report(error);
    await report(new Error("connection lost"));
    await report(Status.FAILED);

    const messages = JSON.parse(JSON.stringify(runtime.messages()));
    expect(messages).toEqual([
      {
        type: "global_error",
        data: { status: Status.BROKEN, message: "boom", trace: "stack", actual: "0", expected: "false" },
      },
      {
        type: "global_error",
        data: { status: Status.FAILED, message: "boom", trace: "stack", actual: "0", expected: "false" },
      },
      {
        type: "global_error",
        data: { status: Status.BROKEN, message: "connection lost", trace: expect.any(String) },
      },
      { type: "global_error", data: { status: Status.FAILED } },
    ]);
  });
});
