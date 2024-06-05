import { describe, expect, it } from "vitest";
import { typeToExtension } from "../../../../src/sdk/reporter/utils/attachments.js";

describe("typeToExtension", () => {
  it("should respect provided file extension", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: ".txt",
    });

    expect(extension).toBe(".txt");
  });

  it("should respect provided file extension without leading dot", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: "txt",
    });

    expect(extension).toBe(".txt");
  });

  it("should get extension for well-known content type", () => {
    const extension = typeToExtension({
      contentType: "application/json",
    });

    expect(extension).toBe(".json");
  });

  it("should get extension for allure imagediff", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.allure.image.diff",
    });

    expect(extension).toBe(".imagediff");
  });

  it("should get an empty extension for unknown type", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.unknown",
    });

    expect(extension).toBe("");
  });
});
