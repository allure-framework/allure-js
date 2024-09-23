import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils.js";

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
      parameters: expect.arrayContaining([
        {
          name: "a",
          value: "1",
        },
        {
          name: "b",
          value: "3",
        },
        {
          name: "result",
          value: "4",
        },
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
      parameters: expect.arrayContaining([
        {
          name: "a",
          value: "2",
        },
        {
          name: "b",
          value: "4",
        },
        {
          name: "result",
          value: "6",
        },
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

it("should handle multiple examples tables", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["examples-multi"], ["examples-multi"]);

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "Allure Tests",
      parameters: expect.arrayContaining([
        {
          name: "a",
          value: "1",
        },
        {
          name: "b",
          value: "2",
        },
        {
          name: "c",
          value: "3",
        },
      ]),
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Examples",
          type: ContentType.CSV,
        }),
        expect.objectContaining({
          name: "Examples: default set",
          type: ContentType.CSV,
        }),
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given The sum of the numbers 1 and 2 must be equal to 3",
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "Allure Tests",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Examples",
          type: ContentType.CSV,
        }),
        expect.objectContaining({
          name: "Examples: default set",
          type: ContentType.CSV,
        }),
      ]),
      parameters: expect.arrayContaining([
        {
          name: "a",
          value: "2",
        },
        {
          name: "b",
          value: "2",
        },
        {
          name: "c",
          value: "4",
        },
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given The sum of the numbers 2 and 2 must be equal to 4",
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "Allure Tests",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Examples",
          type: ContentType.CSV,
        }),
        expect.objectContaining({
          name: "Examples: default set",
          type: ContentType.CSV,
        }),
      ]),
      parameters: expect.arrayContaining([
        {
          name: "a",
          value: "3",
        },
        {
          name: "b",
          value: "10",
        },
        {
          name: "c",
          value: "13",
        },
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given The sum of the numbers 3 and 10 must be equal to 13",
        }),
      ]),
    }),
  );
  expect(Object.keys(attachments as object)).toHaveLength(6);
});

it("should create same test case id for scenario outline tests with template name", async () => {
  const { tests } = await runCucumberInlineTest(["examples-name-change"], ["examples-multi"]);

  expect(tests).toHaveLength(2);
  const [tr1, tr2] = tests;
  expect(tr1.testCaseId).toEqual(tr2.testCaseId);
});
