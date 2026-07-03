import { join } from "node:path";

import { LabelName } from "allure-js-commons";
import { afterEach, describe, expect, it } from "vitest";

import { createRuntimeMessageRecord, setNodeTestTracingStoreProvider } from "../../src/runtime.js";
import { getAllureFullNameFromParts, normalizeFilePath } from "../../src/utils.js";

describe("createRuntimeMessageRecord", () => {
  afterEach(() => {
    setNodeTestTracingStoreProvider(() => undefined);
  });

  it("uses node:test tracing data when TestContext is unavailable", () => {
    const file = normalizeFilePath(join(process.cwd(), "test/fixtures/runtime-fallback.test.mjs"));
    const message = {
      type: "metadata",
      data: {
        labels: [{ name: LabelName.FEATURE, value: "fallback" }],
      },
    } as const;

    setNodeTestTracingStoreProvider(() => ({
      file,
      fullName: "Runtime fallback > uses tracing data",
      name: "uses tracing data",
      testId: 17,
      type: "test",
    }));

    expect(createRuntimeMessageRecord(message)).toEqual(
      expect.objectContaining({
        version: 1,
        pid: process.pid,
        testId: 17,
        file,
        name: "uses tracing data",
        nodeFullName: "Runtime fallback > uses tracing data",
        allureFullName: getAllureFullNameFromParts(file, ["Runtime fallback", "uses tracing data"]),
        type: "test",
        message,
      }),
    );
  });
});
