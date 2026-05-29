import { ContentType, LabelName, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/execution.html";
type StepResultLike = {
  name: string;
  attachments?: Array<{ name: string; source: string; type: string }>;
  steps?: StepResultLike[];
};

const findStepByName = (steps: StepResultLike[], pattern: RegExp): StepResultLike | undefined => {
  for (const step of steps) {
    if (pattern.test(step.name)) {
      return step;
    }

    const nestedStep = findStepByName(step.steps ?? [], pattern);
    if (nestedStep) {
      return nestedStep;
    }
  }

  return undefined;
};

it("keeps runtime labels, parameters, steps, and attachments isolated under runner concurrency", async () => {
  const { tests, attachments } = await runTestCafeInlineTest(
    {
      "pages/execution.html":
        "<html><body><input id='name'/><button id='submit' type='button'>Submit</button></body></html>",
      "tests/concurrency.test.js": `
        fixture\`Concurrency fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("parallel a", async t => {
          await t.typeText("#name", "value-a");
          await t.takeScreenshot("parallel-a.png");
          await t.click("#submit");
          await t.wait(50);
        }).meta({
          case: "alpha",
          "allure.label.owner": "owner-a",
        });

        test("parallel b", async t => {
          await t.typeText("#name", "value-b");
          await t.takeScreenshot("parallel-b.png");
          await t.click("#submit");
          await t.wait(50);
        }).meta({
          case: "beta",
          "allure.label.owner": "owner-b",
        });
      `,
    },
    {
      concurrency: 2,
      screenshots: {
        takeOnFails: false,
        thumbnails: false,
      },
    },
  );

  const testByName = new Map(tests.map((testResult) => [testResult.name, testResult]));
  const first = testByName.get("parallel a");
  const second = testByName.get("parallel b");
  const firstScreenshot = findStepByName(first?.steps ?? [], /^takeScreenshot\(/)?.attachments?.find(
    ({ type }) => type === ContentType.PNG,
  );
  const secondScreenshot = findStepByName(second?.steps ?? [], /^takeScreenshot\(/)?.attachments?.find(
    ({ type }) => type === ContentType.PNG,
  );

  await check("verifies concurrent runs keep labels, parameters, and steps isolated", () => {
    expect(tests).toHaveLength(2);
    expect(first).toEqual(
      expect.objectContaining({
        labels: expect.arrayContaining([{ name: LabelName.OWNER, value: "owner-a" }]),
        parameters: expect.arrayContaining([{ name: "case", value: "alpha" }]),
        steps: expect.arrayContaining([
          expect.objectContaining({ name: "typeText(#name)", status: Status.PASSED }),
          expect.objectContaining({ name: expect.stringContaining("takeScreenshot(") }),
        ]),
      }),
    );
    expect(second).toEqual(
      expect.objectContaining({
        labels: expect.arrayContaining([{ name: LabelName.OWNER, value: "owner-b" }]),
        parameters: expect.arrayContaining([{ name: "case", value: "beta" }]),
        steps: expect.arrayContaining([
          expect.objectContaining({ name: "typeText(#name)", status: Status.PASSED }),
          expect.objectContaining({ name: expect.stringContaining("takeScreenshot(") }),
        ]),
      }),
    );
    expect(first?.labels).not.toEqual(expect.arrayContaining([{ name: LabelName.OWNER, value: "owner-b" }]));
    expect(second?.labels).not.toEqual(expect.arrayContaining([{ name: LabelName.OWNER, value: "owner-a" }]));
  });

  await check("verifies concurrent screenshots remain distinct and readable", () => {
    expect(firstScreenshot).toEqual(expect.objectContaining({ type: ContentType.PNG, source: expect.any(String) }));
    expect(secondScreenshot).toEqual(expect.objectContaining({ type: ContentType.PNG, source: expect.any(String) }));
    expect(firstScreenshot?.source).not.toBe(secondScreenshot?.source);
    expect(firstScreenshot?.source && attachments[firstScreenshot.source]).toBeInstanceOf(Buffer);
    expect(secondScreenshot?.source && attachments[secondScreenshot.source]).toBeInstanceOf(Buffer);
  });
});

it("captures quarantine details and unstable tagging from real quarantine runs", async () => {
  const { tests, attachments } = await runTestCafeInlineTest(
    {
      "pages/execution.html": "<html><body><h1>Quarantine</h1></body></html>",
      "tests/quarantine.test.js": `
        const fs = require("node:fs");
        const path = require("node:path");

        fixture\`Quarantine fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("quarantine unstable", async t => {
          const attemptFile = path.join(process.cwd(), "quarantine-attempt.txt");
          const currentAttempt = (fs.existsSync(attemptFile) ? Number(fs.readFileSync(attemptFile, "utf8")) : 0) + 1;

          fs.writeFileSync(attemptFile, String(currentAttempt), "utf8");

          await t.expect(currentAttempt).gte(2);
        });
      `,
    },
    {
      runOptions: {
        disableNativeAutomation: true,
        quarantineMode: {
          successThreshold: 1,
          attemptLimit: 2,
        },
      },
    },
  );

  const [testResult] = tests;
  const quarantineAttachment = testResult.attachments.find(({ name }) => name === "Quarantine");

  await check("verifies unstable quarantine runs are surfaced on the logical test", () => {
    expect(testResult).toEqual(
      expect.objectContaining({
        name: "quarantine unstable",
        status: Status.PASSED,
        labels: expect.arrayContaining([{ name: LabelName.TAG, value: "unstable" }]),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            name: "Quarantine",
            type: ContentType.JSON,
          }),
        ]),
      }),
    );
    expect(quarantineAttachment?.source).toBeTruthy();
  });

  await check("verifies quarantine attachment content is preserved", () => {
    expect(quarantineAttachment?.source && attachments[quarantineAttachment.source].toString("utf8")).toContain('"1"');
  });
});
