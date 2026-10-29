import { ContentType } from "allure-js-commons";
import { expect, it } from "vitest";

import { serializeCsvRow } from "../../src/utils.js";
import { runCucumberInlineTest } from "../utils.js";

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
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Data table",
          type: ContentType.CSV,
          source: expect.any(String),
        }),
      ]),
    }),
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  expect(attachments).toHaveProperty(tests[0].attachments[0].source);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  expect(attachments).toHaveProperty(tests[0].steps[0].attachments[0].source);
});

it("escapes special values in Examples and DataTable CSV attachments", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["csvEscaping"], ["dataTableAndExamples"]);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe("passed");
  expect(tests[0].parameters).toEqual([
    { name: "plain", value: "normal" },
    { name: "comma,header", value: "a,b" },
    { name: 'quote"header', value: 'say "hello"' },
    { name: "line\nheader", value: "first\nsecond" },
    { name: "empty", value: "" },
    { name: "unicode", value: "Привет 🚀" },
  ]);

  const examples = tests[0].attachments;
  const dataTable = tests[0].steps[0].attachments;
  expect(examples).toHaveLength(1);
  expect(dataTable).toHaveLength(1);
  expect(examples[0]).toMatchObject({ name: "Examples", type: ContentType.CSV });
  expect(dataTable[0]).toMatchObject({ name: "Data table", type: ContentType.CSV });

  const expectedCsv =
    'plain,"comma,header","quote""header","line\nheader",empty,unicode\n' +
    'normal,"a,b","say ""hello""","first\nsecond",,Привет 🚀\n';
  for (const attachment of [...examples, ...dataTable]) {
    expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(expectedCsv);
  }
});

it("quotes carriage returns that cannot be represented in a Gherkin table cell", () => {
  expect(serializeCsvRow(["first\rsecond", "first\r\nsecond"])).toBe('"first\rsecond","first\r\nsecond"');
});
