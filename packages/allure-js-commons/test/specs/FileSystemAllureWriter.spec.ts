import { randomUUID } from "crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "fs";
import * as os from "os";
import path from "path";
import { expect } from "chai";

import { AllureConfig, AllureRuntime, ContentType } from "../../dist";

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
    expect(resultFiles).length(1);

    const [actualAttachment] = resultFiles;

    const actualContent = readFileSync(path.join(allureResults, actualAttachment));
    expect(actualContent.toString("utf-8")).to.be.eq(data, "data should match");
  });

  it("Should create allure-report nested path", () => {
    const tmpReportPath = path.join(os.tmpdir(), `./allure-testing-dir/${randomUUID()}`);
    const config: AllureConfig = {
      resultsDir: tmpReportPath,
    };
    new AllureRuntime(config);
    expect(existsSync(tmpReportPath)).to.be.eq(true);
  });
});
