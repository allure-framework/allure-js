import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils.js";

it("handles runtime attachments", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["attachments"], ["attachments"]);

  expect(tests).toHaveLength(4);
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a text",
          steps: [expect.objectContaining({
            name: "Text attachment",
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "Text attachment",
                type: "text/plain",
              }),
            ]),
          })]
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add an image",
          steps: [expect.objectContaining({
            name: "Image attachment",
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "Image attachment",
                type: "image/png",
              }),
            ]),
          })]
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a cucumber text attachment",
          steps: [expect.objectContaining({
            name: "Attachment",
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "Attachment",
                type: "text/plain",
              }),
            ]),
          })]
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a cucumber binary text attachment",
          steps: [expect.objectContaining({
            name: "Attachment",
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "Attachment",
                type: "text/plain",
              }),
            ]),
          })]
        }),
      ]),
    }),
  );
  expect(Object.keys(attachments as object)).toHaveLength(4);
});
