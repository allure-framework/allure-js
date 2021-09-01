import { AllureConfig, AllureRuntime, ContentType } from "../../dist";
import { promises as fs } from "fs";
import path from "path";
import * as os from "os";
import { readdirSync, writeFileSync } from "fs";
import { expect } from "chai";

describe("FileSystemAllureWriter", async () => {
  it("should save attachment from path", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "foo-"));
    const allureResults = path.join(tmp, "allure-results");

    const config: AllureConfig = {
      resultsDir: allureResults,
    };

    const runtime = new AllureRuntime(config);

    const from = path.join(tmp, "test-attachment.txt");
    await writeFileSync(from, "test content");

    runtime.writeAttachmentFromPath(from, { contentType: ContentType.TEXT });

    const resultFiles = readdirSync(allureResults);
    expect(resultFiles).length(1);
  });
});
