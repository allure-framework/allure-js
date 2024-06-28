import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("should add attachments into steps", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, allure } from 'allure-playwright';

      test('should add attachment', async ({}, testInfo) => {
        await allure.step('outer step 1', async () => {
          await allure.step('inner step 1.1', async () => {
            await allure.attachment('some', 'some-data', 'text/plain');
          });
          await allure.step('inner step 1.2', async () => {
          });
        });
        await allure.step('outer step 2', async () => {
          await allure.step('inner step 2.1', async () => {
          });
          await allure.step('inner step 2.2', async () => {
            await allure.attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      attachments: [],
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "outer step 1",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "inner step 1.1",
              steps: [
                expect.objectContaining({
                  name: "some",
                  attachments: expect.arrayContaining([
                    expect.objectContaining({
                      name: "some",
                      type: ContentType.TEXT,
                    }),
                  ]),
                }),
              ],
            }),
            expect.objectContaining({
              name: "inner step 1.2",
              attachments: [],
            }),
          ]),
        }),
        expect.objectContaining({
          name: "outer step 2",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "inner step 2.1",
            }),
            expect.objectContaining({
              name: "inner step 2.2",
              steps: [
                expect.objectContaining({
                  name: "some",
                  attachments: expect.arrayContaining([
                    expect.objectContaining({
                      name: "some",
                      type: ContentType.TEXT,
                    }),
                  ]),
                }),
              ],
            }),
          ]),
        }),
      ]),
    }),
  );

  const [attachment1] = tests[0].steps[0].steps[0].steps[0].attachments;
  const [attachment2] = tests[0].steps[1].steps[1].steps[0].attachments;

  expect(attachments).toHaveProperty(attachment1.source);
  expect(attachments).toHaveProperty(attachment2.source);
  expect(Buffer.from(attachments[attachment1.source] as string, "base64").toString()).toEqual("some-data");
  expect(Buffer.from(attachments[attachment2.source] as string, "base64").toString()).toEqual("other-data");
});

it("doesn't not report detail steps for attachments", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, allure } from 'allure-playwright';

      test('should add attachment', async ({}, testInfo) => {
        await allure.step('outer step 1', async () => {
          await allure.step('inner step 1.1', async () => {
            await allure.attachment('some', 'some-data', 'text/plain');
          });
          await allure.step('inner step 1.2', async () => {
          });
        });
        await allure.step('outer step 2', async () => {
          await allure.step('inner step 2.1', async () => {
          });
          await allure.step('inner step 2.2', async () => {
            await allure.attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: true,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "outer step 1",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "inner step 1.1",
              steps: [
                expect.objectContaining({
                  name: "some",
                  attachments: expect.arrayContaining([
                    expect.objectContaining({
                      name: "some",
                      type: ContentType.TEXT,
                    }),
                  ]),
                }),
              ],
            }),
            expect.objectContaining({
              name: "inner step 1.2",
            }),
          ]),
        }),
        expect.objectContaining({
          name: "outer step 2",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "inner step 2.1",
            }),
            expect.objectContaining({
              name: "inner step 2.2",
              steps: [
                expect.objectContaining({
                  name: "some",
                  attachments: expect.arrayContaining([
                    expect.objectContaining({
                      name: "some",
                      type: ContentType.TEXT,
                    }),
                  ]),
                }),
              ],
            }),
          ]),
        }),
      ]),
    }),
  );

  const [attachment1] = tests[0].steps[1].steps[0].steps[0].attachments;
  const [attachment2] = tests[0].steps[2].steps[1].steps[0].attachments;

  expect(attachments).toHaveProperty(attachment1.source);
  expect(attachments).toHaveProperty(attachment2.source);
  expect(Buffer.from(attachments[attachment1.source] as string, "base64").toString()).toEqual("some-data");
  expect(Buffer.from(attachments[attachment2.source] as string, "base64").toString()).toEqual("other-data");
});
