import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContentType } from "../../../../src/model.js";
import { ReporterRuntime } from "../../../../src/sdk/reporter/ReporterRuntime.js";
import type { ReporterRuntimeConfig } from "../../../../src/sdk/reporter/types.js";
import { FileSystemWriter } from "../../../../src/sdk/reporter/writer/FileSystemWriter.js";

describe("FileSystemWriter", () => {
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

    const attachmentResultPath = resultFiles.find((file) => file.includes("attachment"))!;
    const actualContent = readFileSync(path.join(allureResults, attachmentResultPath));

    expect(actualContent.toString("utf8")).toBe(data);
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

  it("writes globals file", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: allureResults,
      }),
    };
    const runtime = new ReporterRuntime(config);

    runtime.applyRuntimeMessages(undefined, [
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
    runtime.writeGlobalInfo();

    const resultFiles = readdirSync(allureResults);
    const globalsFile = resultFiles.find((file) => file.endsWith("-globals.json"));
    expect(globalsFile).toBeDefined();

    const globalsContent = JSON.parse(readFileSync(path.join(allureResults, globalsFile!), "utf-8")) as {
      attachments: { name: string; source: string; type: string }[];
      errors: { message: string; trace: string }[];
    };

    expect(globalsContent.attachments).toHaveLength(1);
    expect(globalsContent.attachments[0]).toEqual(
      expect.objectContaining({
        name: "global log",
        type: ContentType.TEXT,
      }),
    );
    expect(globalsContent.errors).toEqual([
      {
        message: "boom",
        trace: "stack",
      },
    ]);
  });

  it("writes empty globals file", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");
    const config: ReporterRuntimeConfig = {
      writer: new FileSystemWriter({
        resultsDir: allureResults,
      }),
    };
    const runtime = new ReporterRuntime(config);

    runtime.writeGlobalInfo();

    const resultFiles = readdirSync(allureResults);
    const globalsFile = resultFiles.find((file) => file.endsWith("-globals.json"));
    expect(globalsFile).toBeDefined();

    const globalsContent = JSON.parse(readFileSync(path.join(allureResults, globalsFile!), "utf-8")) as {
      attachments: unknown[];
      errors: unknown[];
    };

    expect(globalsContent).toEqual({
      attachments: [],
      errors: [],
    });
  });
});
