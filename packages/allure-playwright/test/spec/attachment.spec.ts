import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons/new/sdk/node";
import { runPlaywrightInlineTest } from "../utils";

it("doesn't not throw on missing attachment", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';

      test('should add attachment', async ({}, testInfo) => {
        testInfo.attachments.push({
          name: 'file-attachment',
          path: 'does-not-exist.txt',
          contentType: 'text/plain'
        });

        testInfo.attachments.push({
          name: 'buffer-attachment',
          body: Buffer.from('foo'),
          contentType: 'text/plain'
        });
      });
    `,
  });

  expect(tests[0].attachments).toEqual([
    expect.objectContaining({
      name: "buffer-attachment",
      type: "text/plain",
    }),
  ]);
  expect(attachments[tests[0].attachments[0].source]).toEqual(Buffer.from("foo").toString("base64"));
});

it("adds snapshots correctly and provide a screenshot diff", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';

      test('should add attachment', async ({ page }, testInfo) => {
        testInfo.snapshotSuffix = '';

        test.expect(await page.screenshot()).toMatchSnapshot("foo.png");
      });
    `,
    "sample.test.js-snapshots/foo-project.png": readFileSync(
      resolve(__dirname, "../assets/attachment-1-not-expected.png"),
    ),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toContainEqual({
    name: "foo",
    type: "application/vnd.allure.image.diff",
    source: expect.stringMatching(/.*\.imagediff/),
  });
});

it("should add attachments into steps", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';
      import { step, attachment } from 'allure-js-commons/new';

      test('should add attachment', async ({}, testInfo) => {
        await step('outer step 1', async () => {
          await step('inner step 1.1', async () => {
            await attachment('some', 'some-data', 'text/plain');
          });
          await step('inner step 1.2', async () => {
          });
        });
        await step('outer step 2', async () => {
          await step('inner step 2.1', async () => {
          });
          await step('inner step 2.2', async () => {
            await attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
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
              attachments: expect.arrayContaining([
                expect.objectContaining({
                  name: "some",
                  type: ContentType.TEXT,
                }),
              ]),
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
              attachments: [],
            }),
            expect.objectContaining({
              name: "inner step 2.2",
              attachments: expect.arrayContaining([
                expect.objectContaining({
                  name: "some",
                  type: ContentType.TEXT,
                }),
              ]),
            }),
          ]),
        }),
      ]),
    }),
  );

  const [attachment1] = tests[0].steps[0].steps[0].attachments;
  const [attachment2] = tests[0].steps[1].steps[1].attachments;

  expect(attachments).toHaveProperty(attachment1.source);
  expect(attachments).toHaveProperty(attachment2.source);
  expect(Buffer.from(attachments[attachment1.source], "base64").toString()).toEqual("some-data");
  expect(Buffer.from(attachments[attachment2.source], "base64").toString()).toEqual("other-data");
});

it("doesn't not report detail steps for attachments", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';
      import { step, attachment } from 'allure-js-commons/new';

      test('should add attachment', async ({}, testInfo) => {
        await step('outer step 1', async () => {
          await step('inner step 1.1', async () => {
            await attachment('some', 'some-data', 'text/plain');
          });
          await step('inner step 1.2', async () => {
          });
        });
        await step('outer step 2', async () => {
          await step('inner step 2.1', async () => {
          });
          await step('inner step 2.2', async () => {
            await attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
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
      attachments: [],
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "outer step 1",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "inner step 1.1",
              attachments: expect.arrayContaining([
                expect.objectContaining({
                  name: "some",
                  type: ContentType.TEXT,
                }),
              ]),
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
              attachments: [],
            }),
            expect.objectContaining({
              name: "inner step 2.2",
              attachments: expect.arrayContaining([
                expect.objectContaining({
                  name: "some",
                  type: ContentType.TEXT,
                }),
              ]),
            }),
          ]),
        }),
      ]),
    }),
  );

  const [attachment1] = tests[0].steps[2].steps[0].attachments;
  const [attachment2] = tests[0].steps[3].steps[1].attachments;

  expect(attachments).toHaveProperty(attachment1.source);
  expect(attachments).toHaveProperty(attachment2.source);
  expect(Buffer.from(attachments[attachment1.source], "base64").toString()).toEqual("some-data");
  expect(Buffer.from(attachments[attachment2.source], "base64").toString()).toEqual("other-data");
});
