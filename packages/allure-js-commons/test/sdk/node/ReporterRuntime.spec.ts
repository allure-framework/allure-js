import { describe, expect, it } from "vitest";
import { AllureNodeReporterRuntime } from "../../../src/sdk/node";
import { mockWriter } from "../../utils/writer.js";

describe("AllureNodeReporterRuntime", () => {
  describe("writeAttachmentFromPath", () => {
    it("should use extension from fileExtension option if specified", () => {
      const writer = mockWriter();
      const runtime = new AllureNodeReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachmentFromPath("some attachment", "some/path/to/file", {
        fileExtension: ".mst",
        contentType: "*/*",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.mst/);
      const writeAttachmentFromPathCall = writer.writeAttachmentFromPath.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq("some/path/to/file");
      expect(writeAttachmentFromPathCall[1]).to.be.eq(attachment.source);
    });

    it("should use extension from original file if fileExtension option is not specified", () => {
      const writer = mockWriter();
      const runtime = new AllureNodeReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachmentFromPath("some attachment", "some/path/to/file.abc", {
        contentType: "*/*",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.abc/);
      const writeAttachmentFromPathCall = writer.writeAttachmentFromPath.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq("some/path/to/file.abc");
      expect(writeAttachmentFromPathCall[1]).to.be.eq(attachment.source);
    });

    it("should detect extension by content type if no option or path specified", () => {
      const writer = mockWriter();
      const runtime = new AllureNodeReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachment({
        contentType: "text/csv",
        name: "some other attachment",
        content: "attachment content",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some other attachment");
      expect(attachment.source).to.match(/.+\.csv/);
      const writeAttachmentFromPathCall = writer.writeAttachment.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq(attachment.source);
      expect(writeAttachmentFromPathCall[1]).to.be.eq("attachment content");
    });
  });
});
