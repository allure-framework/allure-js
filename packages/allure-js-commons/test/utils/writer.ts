import { type Mocked, vi } from "vitest";
import type { TestResult, TestResultContainer } from "../../src/index.js";
import type { Category, EnvironmentInfo } from "../../src/sdk/index.js";
import type { Writer } from "../../src/sdk/reporter/index.js";

export const mockWriter = (): Mocked<Writer> => ({
  writeResult: vi.fn<[TestResult], void>(),
  writeGroup: vi.fn<[TestResultContainer], void>(),
  writeAttachmentFromPath: vi.fn<[string, string], void>(),
  writeAttachment: vi.fn<[string, Buffer], void>(),
  writeEnvironmentInfo: vi.fn<[EnvironmentInfo], void>(),
  writeCategoriesDefinitions: vi.fn<[Category[]], void>(),
});
