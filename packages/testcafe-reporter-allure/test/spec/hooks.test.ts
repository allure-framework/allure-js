import { ContentType, LabelName, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/hooks.html";

const getAllStepNames = (steps: Array<{ name: string; steps?: Array<{ name: string; steps?: any[] }> }>): string[] =>
  steps.flatMap((step) => [step.name, ...getAllStepNames(step.steps ?? [])]);

it("supports runtime APIs inside fixture beforeEach and afterEach hooks", async () => {
  const { tests, attachments } = await runTestCafeInlineTest({
    "pages/hooks.html": "<html><body><input id='name'/><button id='submit' type='button'>Submit</button></body></html>",
    "tests/fixture-hooks.test.js": `
      const { attachment, owner, step } = require("allure-js-commons");

      fixture\`Hook fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`
        .beforeEach(async t => {
          await owner("fixture-owner");
          await step("fixture beforeEach", async () => {
            await t.click("#submit");
          });
        })
        .afterEach(async t => {
          await step("fixture afterEach", async () => {
            await attachment("after-each.txt", "done", "text/plain");
            await t.pressKey("tab");
          });
        });

      test("fixture hooks", async t => {
        await step("test body", async (ctx) => {
          await ctx.parameter("phase", "body");
          await t.typeText("#name", "demo-user");
        });
      });
    `,
  });

  const [testResult] = tests;
  const stepNames = getAllStepNames(testResult.steps);
  const afterEachAttachment = testResult.steps
    .flatMap((step) => step.steps ?? [])
    .flatMap((step) => step.attachments ?? [])
    .find(({ name }) => name === "after-each.txt");

  await check("verifies fixture hook runtime APIs add labels and nested steps to the owning test", () => {
    expect(testResult.labels).toEqual(expect.arrayContaining([{ name: LabelName.OWNER, value: "fixture-owner" }]));
    expect(stepNames).toEqual(
      expect.arrayContaining([
        "fixture beforeEach",
        "click(#submit)",
        "test body",
        "typeText(#name)",
        "fixture afterEach",
        "pressKey(tab)",
      ]),
    );
    expect(afterEachAttachment).toEqual(
      expect.objectContaining({
        name: "after-each.txt",
        type: ContentType.TEXT,
      }),
    );
  });

  await check("verifies fixture hook attachments keep their bytes", () => {
    expect(afterEachAttachment?.source && attachments[afterEachAttachment.source]).toBeInstanceOf(Buffer);
  });
});

it("supports runtime APIs inside test.before and test.after hooks", async () => {
  const { tests } = await runTestCafeInlineTest({
    "pages/hooks.html": "<html><body><input id='name'/><button id='submit' type='button'>Submit</button></body></html>",
    "tests/test-hooks.test.js": `
      const { severity, step, tag } = require("allure-js-commons");

      fixture\`Test hook fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

      test
        .before(async t => {
          await tag("pre-hook");
          await step("test.before", async () => {
            await t.typeText("#name", "setup-value");
          });
        })
        .after(async t => {
          await severity("minor");
          await step("test.after", async () => {
            await t.click("#submit");
          });
        })("test hooks", async t => {
          await t.expect(1).eql(1);
        });
    `,
  });

  const [testResult] = tests;
  const stepNames = getAllStepNames(testResult.steps);

  await check("verifies test-level before and after hooks contribute labels and steps", () => {
    expect(testResult.labels).toEqual(
      expect.arrayContaining([
        { name: LabelName.TAG, value: "pre-hook" },
        { name: LabelName.SEVERITY, value: "minor" },
      ]),
    );
    expect(stepNames).toEqual(
      expect.arrayContaining(["test.before", "typeText(#name)", "test.after", "click(#submit)", "expect(1).eql(1)"]),
    );
  });
});

it("reports hook failures on the owning test without synthetic fixture containers", async () => {
  const { tests, groups } = await runTestCafeInlineTest({
    "pages/hooks.html": "<html><body><button id='submit' type='button'>Submit</button></body></html>",
    "tests/hook-failure.test.js": `
      fixture\`Broken hook fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`
        .beforeEach(async t => {
          await t.click("#submit");
          throw new Error("beforeEach boom");
        });

      test("hook failure", async t => {
        await t.expect(true).ok();
      });
    `,
  });

  await check("verifies hook failures stay on the owning test", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        name: "hook failure",
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("beforeEach boom"),
        }),
      }),
    ]);
  });

  await check("verifies no synthetic fixture containers are created for hook failures", () => {
    expect(groups.every((group) => !group.befores?.length && !group.afters?.length)).toBe(true);
  });
});
