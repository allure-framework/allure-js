import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils";

it("handles runtime attachments", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["attachments"], ["attachments"]);

  debugger

  expect(tests).toHaveLength(4);
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a text",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              name: "Text attachment",
              type: "text/plain",
            }),
          ]),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add an image",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              name: "Image attachment",
              type: "image/png",
            }),
          ]),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a cucumber text attachment",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              name: "Attachment",
              type: "text/plain",
            }),
          ]),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given add a cucumber binary text attachment",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              name: "Attachment",
              type: "text/plain",
            }),
          ]),
        }),
      ]),
    }),
  );
  expect(Object.keys(attachments as object)).toHaveLength(4);
});
