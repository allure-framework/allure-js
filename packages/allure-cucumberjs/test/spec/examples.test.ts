import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons/new/sdk";
import { runCucumberInlineTest } from "../utils";

it("handles examples table", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["examples"], ["examples"]);

  expect(tests).toHaveLength(2);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "scenario with positive examples",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Examples",
          type: ContentType.CSV,
        }),
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given a is 1",
        }),
        expect.objectContaining({
          name: "And b is 3",
        }),
        expect.objectContaining({
          name: "When I add a to b",
        }),
        expect.objectContaining({
          name: "Then result is 4",
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "scenario with positive examples",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Examples",
          type: ContentType.CSV,
        }),
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given a is 2",
        }),
        expect.objectContaining({
          name: "And b is 4",
        }),
        expect.objectContaining({
          name: "When I add a to b",
        }),
        expect.objectContaining({
          name: "Then result is 6",
        }),
      ]),
    }),
  );
  expect(Object.keys(attachments as object)).toHaveLength(2);
});
