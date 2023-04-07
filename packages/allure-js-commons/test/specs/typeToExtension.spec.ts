import { expect } from "chai";
import { typeToExtension } from "../../dist/src/writers/utils";

describe("typeToExtension", () => {
  it("customExtension", () => {
    expect(
      typeToExtension({ fileExtension: "customExtension", contentType: "customCOntentType" }),
    ).to.eq("customExtension");
  });

  it("xls", () => {
    expect(typeToExtension({ contentType: "application/vnd.ms-excel" })).to.eq("xls");
  });

  it("xlsx", () => {
    expect(
      typeToExtension({
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).to.eq("xlsx");
  });
});
