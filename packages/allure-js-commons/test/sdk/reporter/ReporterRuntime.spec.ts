import { describe, expect, it } from "vitest";
import type { Link } from "../../../src/model.js";
import { ReporterRuntime } from "../../../src/sdk/reporter/ReporterRuntime.js";
import { mockWriter } from "../../utils/writer.js";

const fixtures = {
  links: [
    {
      url: "1",
      name: "issue-1",
      type: "issue",
    },
    {
      url: "2",
      type: "tms",
    },
    {
      url: "3",
      type: "custom",
    },
  ] as Link[],
};

describe("ReporterRuntime", () => {
  describe("writeAttachmentFromPath", () => {
    it("should use extension from fileExtension option if specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachmentFromPath("some attachment", "some/path/to/file", {
        fileExtension: ".mst",
        contentType: "*/*",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.mst/);
      const writeAttachmentFromPathCall = writer.writeAttachmentFromPath.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq(attachment.source);
      expect(writeAttachmentFromPathCall[1]).to.be.eq("some/path/to/file");
    });

    it("should use extension from original file if fileExtension option is not specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachmentFromPath("some attachment", "some/path/to/file.abc", {
        contentType: "*/*",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.abc/);
      const writeAttachmentFromPathCall = writer.writeAttachmentFromPath.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq(attachment.source);
      expect(writeAttachmentFromPathCall[1]).to.be.eq("some/path/to/file.abc");
    });

    it("should detect extension by content type if no option or path specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      runtime.startTest({});

      runtime.writeAttachment("some other attachment", Buffer.from("attachment content"), {
        contentType: "text/csv",
      });

      const attachment = runtime.getCurrentTest()!.attachments[0];

      expect(attachment.name).to.be.eq("some other attachment");
      expect(attachment.source).to.match(/.+\.csv/);
      const writeAttachmentFromPathCall = writer.writeAttachment.mock.calls[0];

      expect(writeAttachmentFromPathCall[0]).to.be.eq(attachment.source);
      expect(writeAttachmentFromPathCall[1].toString("utf-8")).to.be.eq("attachment content");
    });
  });

  describe("applyRuntimeMessages", () => {
    it("keeps links as they are when links configuration is not provided", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      runtime.startTest({});
      runtime.applyRuntimeMessages([
        {
          type: "metadata",
          data: {
            links: fixtures.links,
          },
        },
      ]);
      runtime.writeTest();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(writer.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({
          links: fixtures.links,
        }),
      );
    });

    it("transforms links according the runtime configuration", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({
        writer,
        links: {
          issue: {
            urlTemplate: "https://allurereport.org/issues/%s",
            nameTemplate: "Issue %s",
          },
          tms: {
            urlTemplate: "https://allurereport.org/tasks/%s",
            nameTemplate: "Task %s",
          },
        },
      });

      runtime.startTest({});
      runtime.applyRuntimeMessages([
        {
          type: "metadata",
          data: {
            links: fixtures.links,
          },
        },
      ]);
      runtime.writeTest();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(writer.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({
          links: [
            {
              type: "issue",
              url: "https://allurereport.org/issues/1",
              name: "issue-1",
            },
            {
              type: "tms",
              url: "https://allurereport.org/tasks/2",
              name: "Task 2",
            },
            fixtures.links[2],
          ],
        }),
      );
    });
  });

  describe("load well-known writers", () => {
    it("should load MessageWriter", () => {
      new ReporterRuntime({ writer: "MessageWriter" });
    });
    it("should load FileSystemWriter", () => {
      new ReporterRuntime({ writer: "FileSystemWriter" });
    });
    it("should load InMemoryWriter", () => {
      new ReporterRuntime({ writer: "InMemoryWriter" });
    });
  });
});
