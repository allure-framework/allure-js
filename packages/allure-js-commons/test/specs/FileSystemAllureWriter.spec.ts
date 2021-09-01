import { AllureConfig, AllureRuntime, ContentType } from "../../dist";
import path from "path";
import * as os from "os";
import { readdirSync, writeFileSync, mkdtempSync, readFileSync } from "fs";
import { expect } from "chai";

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
    expect(actualContent.toString('utf-8')).to.be.eq(data, "data should match");
  });
});
