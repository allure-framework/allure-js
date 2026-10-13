import { expect, it, vi } from "vitest";

const { getGlobalTestRuntimeMock } = vi.hoisted(() => ({
  getGlobalTestRuntimeMock: vi.fn(),
}));

vi.mock("allure-js-commons/sdk/runtime", () => ({
  getGlobalTestRuntime: getGlobalTestRuntimeMock,
}));

it("does not access the runtime on import", async () => {
  await import("../../src/index.js");

  expect(getGlobalTestRuntimeMock).not.toHaveBeenCalled();
});
