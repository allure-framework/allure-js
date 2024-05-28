import { vi } from "vitest";
import type { Category, TestResult, TestResultContainer } from "../../src/index.js";

export const mockWriter = () => ({
  writeResult: vi.fn<[TestResult], void>(),
  writeGroup: vi.fn<[TestResultContainer], void>(),
  writeEnvironmentInfo: vi.fn<[Record<string, string | undefined>], void>(),
  writeCategoriesDefinitions: vi.fn<[Category[]], void>(),
  writeAttachment: vi.fn<[string, Buffer | string, BufferEncoding | undefined], void>(),
  writeAttachmentFromPath: vi.fn<[string, string], void>(),
});
