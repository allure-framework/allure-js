import { randomUUID } from "crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "fs";
import * as os from "os";
import path from "path";
import { env } from "process";
import { describe, expect, it } from "vitest";
import { AllureConfig, AllureRuntime, ContentType, InMemoryAllureWriter } from "allure-js-commons";

describe("FileSystemAllureWriter", () => {
  it("should save attachment from path", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");

    const config: AllureConfig = {
      resultsDir: allureResults,
    };

    const runtime = new AllureRuntime(config);

    const from = path.join(tmp, "test-attachment.txt");
    const data = "test content";
    writeFileSync(from, data);

    runtime.writeAttachmentFromPath(from, { contentType: ContentType.TEXT });

    const resultFiles = readdirSync(allureResults);
    expect(resultFiles).toHaveLength(1);

    const [actualAttachment] = resultFiles;

    const actualContent = readFileSync(path.join(allureResults, actualAttachment));

    expect(actualContent.toString("utf-8")).toBe(data);
  });

  it("Should create allure-report nested path", () => {
    const tmpReportPath = path.join(os.tmpdir(), `./allure-testing-dir/${randomUUID()}`);
    const config: AllureConfig = {
      resultsDir: tmpReportPath,
    };

    new AllureRuntime(config);

    expect(existsSync(tmpReportPath)).toBe(true);
  });

  it("Should add env labels", () => {
    const tmpReportPath = path.join(os.tmpdir(), `./allure-testing-dir/${randomUUID()}`);
    const writer = new InMemoryAllureWriter();

    const config: AllureConfig = {
      resultsDir: tmpReportPath,
      writer,
    };

    env.ALLURE_LABEL_TAG = "testTag";
    const runtime = new AllureRuntime(config);
    const group = runtime.startGroup("test_group");
    const test = group.startTest("test_result");

    test.endTest();
    group.endGroup();

    expect(writer.tests[0].labels[0]).toEqual({ name: "tag", value: "testTag" });
  });
});
