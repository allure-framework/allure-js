import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils";

it("handles runtime attachments", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["attachments"], ["attachments"]);

  expect(tests).toHaveLength(2);
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
  expect(Object.keys(attachments)).toHaveLength(2);
});
