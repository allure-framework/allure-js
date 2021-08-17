import "jasmine";
import { AllureRuntime, ContentType, InMemoryAllureWriter } from "../";

describe("attachments", () => {
  const writer = new InMemoryAllureWriter();
  const runtime = new AllureRuntime({ writer, resultsDir: "unused" });

  it("should return attachment name with -attachments suffix", () => {
    const res = runtime.writeAttachment("some-data", { contentType: ContentType.TEXT });

    expect(res).toMatch(/.+-attachment\.txt/);
  });
});
