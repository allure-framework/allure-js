import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  attachments: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      // according the documentation, world can't be used with arrow functions
      // https://github.com/cucumber/cucumber-js/blob/main/docs/faq.md#the-world-instance-isnt-available-in-my-hooks-or-step-definitions
      Given("a step", function () {
        this.attach("some text");
      });
      Given("add an image", function () {
        // example base64 encoded image for testing.
        // single pixel #007 image
        const base64Image =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGAo/w8AAfIBdzDXaSAAAAAASUVORK5CYII=";
        const decodedImage = Buffer.from(base64Image, "base64");
        this.attach(decodedImage, "image/png");
      });
    }),
    sources: [
      {
        data: ["Feature: attachments", "Scenario: add text attachment", "Given a step"].join("\n"),
        uri: "attachment.feature",
      },
      {
        data: [
          "Feature: image attachments",
          "Scenario: add image attachment",
          "Given add an image",
        ].join("\n"),
        uri: "attachment.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > examples", () => {
  it("should process text attachments", async () => {
    const results = await runFeatures(dataSet.attachments);
    expect(results.tests).length(2);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);
    expect(results.attachments[attachmentsKeys[0]]).eq("some text");

    const [attachment] = results.tests[0].attachments;
    expect(attachment.type).eq("text/plain");
    expect(attachment.source).eq(attachmentsKeys[0]);
  });

  it("should process image attachments", async () => {
    const results = await runFeatures(dataSet.attachments);
    expect(results.tests).length(2);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);

    const [imageAttachment] = results.tests[1].attachments;
    expect(imageAttachment.type).eq("image/png");
  });
});
