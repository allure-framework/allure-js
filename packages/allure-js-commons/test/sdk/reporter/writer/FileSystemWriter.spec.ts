import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  fsyncSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentType, Stage, Status, type TestResult, type TestResultContainer } from "../../../../src/model.js";
import { ReporterRuntime } from "../../../../src/sdk/reporter/ReporterRuntime.js";
import type { ReporterRuntimeConfig } from "../../../../src/sdk/reporter/types.js";
import { FileSystemWriter } from "../../../../src/sdk/reporter/writer/FileSystemWriter.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();

  return {
    ...actual,
    fsyncSync: vi.fn(actual.fsyncSync),
    renameSync: vi.fn(actual.renameSync),
  };
});

const listTmpFiles = (dir: string) => {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".tmp")) : [];
};

const expectNoTmpFiles = (dir: string) => {
  expect(listTmpFiles(dir)).toEqual([]);
};

const createTestResult = (uuid = "test-uuid"): TestResult => ({
  uuid,
  name: "test",
  status: Status.PASSED,
  statusDetails: {},
  stage: Stage.FINISHED,
  steps: [],
  attachments: [],
  parameters: [],
  labels: [],
  links: [],
});

const createTestContainer = (uuid = "container-uuid"): TestResultContainer => ({
  uuid,
  children: [],
  befores: [],
  afters: [],
});

describe("FileSystemWriter", () => {
  beforeEach(() => {
    vi.mocked(fsyncSync).mockClear();
    vi.mocked(renameSync).mockClear();
  });

  it("should save attachment from path", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: allureResults,
      }),
    };
    const runtime = new ReporterRuntime(config);
    const from = path.join(tmp, "test-attachment.txt");
    const data = "test content";

    writeFileSync(from, data, "utf8");

    const testUuid = runtime.startTest({ name: "test" });

    runtime.writeAttachment(testUuid, undefined, "Attachment", from, { contentType: ContentType.TEXT });
    runtime.stopTest(testUuid);
    runtime.writeTest(testUuid);

    const resultFiles = readdirSync(allureResults);

    expect(resultFiles).toHaveLength(2);
    expectNoTmpFiles(allureResults);

    const attachmentResultPath = resultFiles.find((file) => file.includes("attachment"))!;
    const actualContent = readFileSync(path.join(allureResults, attachmentResultPath));

    expect(actualContent.toString("utf8")).toBe(data);
    expect(fsyncSync).toHaveBeenCalledTimes(2);
  });

  it("publishes buffer attachments via a temporary file", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });

    writer.writeAttachment("source-attachment.txt", Buffer.from("attachment body", "utf8"));

    expect(readFileSync(path.join(allureResults, "source-attachment.txt"), "utf-8")).toBe("attachment body");
    expectNoTmpFiles(allureResults);
    expect(fsyncSync).toHaveBeenCalledTimes(1);
  });

  it("publishes read-only path attachments", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });
    const from = path.join(tmp, "read-only-attachment.txt");

    writeFileSync(from, "read-only content", "utf8");
    chmodSync(from, 0o444);

    writer.writeAttachmentFromPath("read-only-attachment.txt", from);

    expect(readFileSync(path.join(allureResults, "read-only-attachment.txt"), "utf-8")).toBe("read-only content");
    expectNoTmpFiles(allureResults);
    expect(fsyncSync).toHaveBeenCalledTimes(1);
  });

  it("writes json and metadata files via the same atomic publish path", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });
    const result = createTestResult("result-uuid");
    const container = createTestContainer("container-uuid");
    const globals = {
      attachments: [],
      errors: [],
    };

    writer.writeResult(result);
    writer.writeGroup(container);
    writer.writeGlobals("global-uuid-globals.json", globals);
    writer.writeCategoriesDefinitions([{ name: "Product defects", matchedStatuses: [Status.FAILED] }]);
    writer.writeEnvironmentInfo({ browser: "chrome", empty: undefined });

    expect(JSON.parse(readFileSync(path.join(allureResults, "result-uuid-result.json"), "utf-8"))).toEqual(result);
    expect(JSON.parse(readFileSync(path.join(allureResults, "container-uuid-container.json"), "utf-8"))).toEqual(
      container,
    );
    expect(JSON.parse(readFileSync(path.join(allureResults, "global-uuid-globals.json"), "utf-8"))).toEqual(globals);
    expect(JSON.parse(readFileSync(path.join(allureResults, "categories.json"), "utf-8"))).toEqual([
      { name: "Product defects", matchedStatuses: [Status.FAILED] },
    ]);
    expect(readFileSync(path.join(allureResults, "environment.properties"), "utf-8")).toBe("browser=chrome");
    expectNoTmpFiles(allureResults);
    expect(fsyncSync).toHaveBeenCalledTimes(5);
  });

  it("flushes the temporary file before publishing the final name", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });
    let tmpFilesDuringFlush: string[] = [];

    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      tmpFilesDuringFlush = listTmpFiles(allureResults);
      expect(existsSync(path.join(allureResults, "result-uuid-result.json"))).toBe(false);
    });

    writer.writeResult(createTestResult("result-uuid"));

    expect(tmpFilesDuringFlush).toHaveLength(1);
    expect(tmpFilesDuringFlush[0]).toMatch(/^result-uuid-result\.json\.\d+\..+\.tmp$/);
    expect(existsSync(path.join(allureResults, "result-uuid-result.json"))).toBe(true);
    expectNoTmpFiles(allureResults);
  });

  it("removes temporary files when publishing fails before rename", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });

    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw new Error("fsync failed");
    });

    expect(() => writer.writeAttachment("failed-attachment.txt", Buffer.from("partial", "utf8"))).toThrow(
      "fsync failed",
    );
    expect(existsSync(path.join(allureResults, "failed-attachment.txt"))).toBe(false);
    expectNoTmpFiles(allureResults);
  });

  it("removes temporary files when publishing fails during rename", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const writer = new FileSystemWriter({
      resultsDir: allureResults,
    });

    vi.mocked(renameSync).mockImplementationOnce(() => {
      throw new Error("rename failed");
    });

    expect(() => writer.writeAttachment("failed-rename-attachment.txt", Buffer.from("content", "utf8"))).toThrow(
      "rename failed",
    );
    expect(existsSync(path.join(allureResults, "failed-rename-attachment.txt"))).toBe(false);
    expectNoTmpFiles(allureResults);
  });

  it("creates allure-report nested path every time writer write something", () => {
    const tmpReportPath = path.join(os.tmpdir(), `./allure-testing-dir/${randomUUID()}`);
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: tmpReportPath,
      }),
    };
    const runtime = new ReporterRuntime(config);
    let testUuid = runtime.startTest({});

    runtime.stopTest(testUuid);
    runtime.writeTest(testUuid);
    rmSync(tmpReportPath, { recursive: true });

    testUuid = runtime.startTest({});
    runtime.stopTest(testUuid);
    runtime.writeTest(testUuid);

    expect(existsSync(tmpReportPath)).toBe(true);
  });

  it("writes globals files eagerly for runtime global messages", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: allureResults,
      }),
    };
    const runtime = new ReporterRuntime(config);

    runtime.applyGlobalRuntimeMessages([
      {
        type: "global_attachment_content",
        data: {
          name: "global log",
          content: Buffer.from("hello", "utf-8").toString("base64"),
          encoding: "base64",
          contentType: ContentType.TEXT,
          fileExtension: ".txt",
        },
      },
      {
        type: "global_error",
        data: {
          message: "boom",
          trace: "stack",
        },
      },
    ]);
    const resultFiles = readdirSync(allureResults);
    const globalsFiles = resultFiles.filter((file) => file.endsWith("-globals.json"));
    expect(globalsFiles).toHaveLength(2);

    const globalsPayloads = globalsFiles.map(
      (file) =>
        JSON.parse(readFileSync(path.join(allureResults, file), "utf-8")) as {
          attachments: { name: string; source: string; type: string; timestamp: number }[];
          errors: { message: string; trace: string; timestamp: number }[];
        },
    );

    const allAttachments = globalsPayloads.flatMap((payload) => payload.attachments);
    const allErrors = globalsPayloads.flatMap((payload) => payload.errors);

    expect(allAttachments).toHaveLength(1);
    expect(allAttachments[0]).toEqual(
      expect.objectContaining({
        name: "global log",
        type: ContentType.TEXT,
        timestamp: expect.any(Number),
      }),
    );
    expect(allErrors).toEqual([
      expect.objectContaining({
        message: "boom",
        trace: "stack",
        timestamp: expect.any(Number),
      }),
    ]);
  });

  it("does not write globals file when there are no global messages", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: allureResults,
      }),
    };
    new ReporterRuntime(config);

    expect(existsSync(allureResults)).toBeFalsy();
  });
});
