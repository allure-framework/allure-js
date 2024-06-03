import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils";

it("handles both data table and examples for one feature", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["dataTableAndExamples"], ["dataTableAndExamples"]);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);
  expect(tests[0].attachments[0]).toMatchObject({
    name: "Examples",
    type: ContentType.CSV,
    source: expect.any(String),
  });
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "Given a table",
      steps: [expect.objectContaining({
        name: "Data table",
        attachments: expect.arrayContaining([
          expect.objectContaining({
            name: "Data table",
            type: ContentType.CSV,
            source: expect.any(String),
          }),
        ]),
      })]
    }),
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  expect(attachments).toHaveProperty(tests[0].attachments[0].source);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  expect(attachments).toHaveProperty(tests[0].steps[0].steps[0].attachments[0].source);
});
