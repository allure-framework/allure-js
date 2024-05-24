import { randomUUID } from "crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "fs";
import * as os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { AllureNodeReporterRuntime, Config, ContentType, FileSystemAllureWriter } from "../../src/sdk/node/index.js";

describe("FileSystemAllureWriter", () => {
  it("should save attachment from path", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");

    const config: Config = {
      writer: new FileSystemAllureWriter({
        resultsDir: allureResults,
      }),
    };

    const runtime = new AllureNodeReporterRuntime(config);

    const from = path.join(tmp, "test-attachment.txt");
    const data = "test content";

    writeFileSync(from, data, "utf8");

    runtime.startTest({ name: "test" });
    runtime.writeAttachmentFromPath("Attachment", from, { contentType: ContentType.TEXT });
    runtime.stopTest();
    runtime.writeTest();

    const resultFiles = readdirSync(allureResults);

    expect(resultFiles).toHaveLength(2);

    const attachmentResultPath = resultFiles.find((file) => file.includes("attachment"))!;

    const actualContent = readFileSync(path.join(allureResults, attachmentResultPath));

    expect(actualContent.toString("utf8")).toBe(data);
  });

  it("creates allure-report nested path every time writer write something", () => {
    const tmpReportPath = path.join(os.tmpdir(), `./allure-testing-dir/${randomUUID()}`);
    const config: Config = {
      writer: new FileSystemAllureWriter({
        resultsDir: tmpReportPath,
      }),
    };
    const runtime = new AllureNodeReporterRuntime(config);

    runtime.startTest({});
    runtime.stopTest();
    runtime.writeTest();

    expect(existsSync(tmpReportPath)).toBe(true);
  });
});
