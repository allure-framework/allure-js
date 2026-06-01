import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/basic.html";
const ACTIONS_PAGE_PATH = "/pages/actions.html";
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

it("captures basic test outcomes and duplicate names", async () => {
  const { tests } = await runTestCafeInlineTest({
    "pages/basic.html": "<html><body><h1>Allure TestCafe</h1></body></html>",
    "tests/status.test.js": `
      fixture\`Status fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

      test("duplicate", async t => {
        await t.expect(1).eql(1);
      });

      test("duplicate", async t => {
        await t.expect(2).eql(2);
      });

      test("assertion failure", async t => {
        await t.expect(1).eql(2);
      });

      test("runtime error", async () => {
        throw new Error("boom");
      });

      test.skip("skipped case", async () => {});
    `,
  });

  const failed = tests.find(({ name }) => name === "assertion failure");
  const broken = tests.find(({ name }) => name === "runtime error");
  const skipped = tests.find(({ name }) => name === "skipped case");

  await check("verifies logical test count and duplicate names", () => {
    expect(tests).toHaveLength(5);
    expect(tests.filter(({ name }) => name === "duplicate")).toHaveLength(2);
  });

  await check("verifies failed and broken outcome mapping", () => {
    expect(failed).toEqual(
      expect.objectContaining({
        name: "assertion failure",
        fullName: expect.stringMatching(/tests\/status\.test\.js#Status fixture#assertion failure$/),
        titlePath: [expect.stringMatching(/tests\/status\.test\.js$/), "Status fixture"],
        status: Status.FAILED,
        stage: Stage.FINISHED,
        labels: expect.arrayContaining([{ name: LabelName.FRAMEWORK, value: "testcafe" }]),
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("expected 1"),
        }),
      }),
    );

    expect(broken).toEqual(
      expect.objectContaining({
        name: "runtime error",
        fullName: expect.stringMatching(/tests\/status\.test\.js#Status fixture#runtime error$/),
        titlePath: [expect.stringMatching(/tests\/status\.test\.js$/), "Status fixture"],
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("boom"),
          trace: expect.stringContaining("Error: boom"),
        }),
      }),
    );
    expect(broken?.statusDetails?.message).not.toBe(broken?.statusDetails?.trace);
  });

  await check("verifies skipped outcome mapping", () => {
    expect(skipped).toEqual(
      expect.objectContaining({
        name: "skipped case",
        status: Status.SKIPPED,
        stage: Stage.PENDING,
      }),
    );
  });
});

it("derives stable testCaseId and historyId values", async () => {
  const files = {
    "workspace/pages/basic.html": "<html><body><h1>Allure TestCafe</h1></body></html>",
    "workspace/tests/identity.test.js": `
      fixture\`Identity fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}/workspace${PAGE_PATH}\`;

      test("duplicate", async t => {
        await t.expect(1).eql(1);
      });

      test("duplicate", async t => {
        await t.expect(2).eql(2);
      });

      test("stable ids", async t => {
        await t.expect(true).ok();
      });
    `,
  } as const;

  const stableRunOptions = {
    projectCwdRelative: "workspace",
    testDirName: "identity-stability",
  } as const;

  const firstRun = await runTestCafeInlineTest(files, stableRunOptions);
  const secondRun = await runTestCafeInlineTest(files, stableRunOptions);
  const duplicateResults = firstRun.tests.filter(({ name }) => name === "duplicate");
  const firstStable = firstRun.tests.find(({ name }) => name === "stable ids");
  const secondStable = secondRun.tests.find(({ name }) => name === "stable ids");

  await check("verifies duplicate tests share testCaseId but keep distinct historyId values", () => {
    expect(duplicateResults).toHaveLength(2);
    expect(new Set(duplicateResults.map(({ testCaseId }) => testCaseId)).size).toBe(1);
    expect(new Set(duplicateResults.map(({ historyId }) => historyId)).size).toBe(2);
    expect(duplicateResults.every(({ historyId, testCaseId }) => Boolean(historyId) && Boolean(testCaseId))).toBe(true);
  });

  await check("verifies stable ids remain stable across repeated runs", () => {
    expect(firstStable?.testCaseId).toBeTruthy();
    expect(firstStable?.historyId).toBeTruthy();
    expect(secondStable).toEqual(
      expect.objectContaining({
        historyId: firstStable?.historyId,
        testCaseId: firstStable?.testCaseId,
      }),
    );
  });
});

it("applies environment labels and reporter global labels", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "pages/basic.html": "<html><body><h1>Allure TestCafe</h1></body></html>",
      "tests/labels.test.js": `
        fixture\`Labels fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("global labels", async t => {
          await t.expect(true).ok();
        });
      `,
    },
    {
      env: {
        ALLURE_LABEL_team: "platform",
      },
      reporterConfig: {
        globalLabels: {
          layer: "e2e",
        },
      },
    },
  );

  await check("verifies environment and reporter labels are applied", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        labels: expect.arrayContaining([
          { name: "team", value: "platform" },
          { name: "layer", value: "e2e" },
        ]),
      }),
    ]);
  });
});

it("captures default TestController actions as steps and nests them under explicit runtime steps", async () => {
  const { tests } = await runTestCafeInlineTest({
    "pages/actions.html":
      "<html><body><input id='name'/><button id='submit' type='button'>Submit</button></body></html>",
    "tests/action-steps.test.js": `
      const { step } = require("allure-js-commons");

      fixture\`Action fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${ACTIONS_PAGE_PATH}\`;

      test("action steps", async t => {
        await step("Outer step", async () => {
          await t.click("#submit");
          await t.typeText("#name", "super-secret", { confidential: true });
          await t.expect(1).eql(1);
          await t.report({ custom: "payload" });
        });
      });
    `,
  });

  const [testResult] = tests;
  const [outerStep] = testResult.steps;
  const childStepNames = outerStep.steps.map(({ name }) => name);

  await check("verifies explicit runtime steps keep nested automatic TestController steps", () => {
    expect(outerStep).toEqual(
      expect.objectContaining({
        name: "Outer step",
      }),
    );
    expect(childStepNames).toEqual(expect.arrayContaining(["click(#submit)", "typeText(#name)", "expect(1).eql(1)"]));
  });

  await check("verifies report actions stay filtered and confidential values stay masked", () => {
    expect(childStepNames.join("\n")).not.toContain("report()");
    expect(childStepNames.join("\n")).not.toContain("super-secret");
  });
});

it("captures request and explicit screenshot actions as steps and attachments", async () => {
  const { tests, attachments } = await runTestCafeInlineTest(
    {
      "api/ping.json": JSON.stringify({ ok: true }),
      "pages/actions.html": "<html><body><button id='submit' type='button'>Submit</button></body></html>",
      "tests/native-actions.test.js": `
        const { step } = require("allure-js-commons");

        fixture\`Native action fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${ACTIONS_PAGE_PATH}\`;

        test("native actions", async t => {
          await step("Outer step", async () => {
            const response = await t.request(\`\${process.env.TESTCAFE_BASE_URL}/api/ping.json\`);
            await t.expect(response.status).eql(200);
            await t.takeScreenshot("manual-shot.png");
          });
        });
      `,
    },
    {
      screenshots: {
        takeOnFails: false,
        thumbnails: false,
      },
    },
  );

  const [testResult] = tests;
  const [outerStep] = testResult.steps;
  const screenshotStep = findStepByName(outerStep?.steps ?? [], /^takeScreenshot\(/);
  const screenshotAttachment = screenshotStep?.attachments?.find(({ type }) => type === ContentType.PNG);

  await check("verifies native request and screenshot actions are captured", () => {
    expect(testResult.status).toBe(Status.PASSED);
    expect(outerStep).toEqual(expect.objectContaining({ name: "Outer step" }));
    expect(screenshotStep).toEqual(expect.objectContaining({ name: expect.stringMatching(/^takeScreenshot\(/) }));
    expect(screenshotAttachment).toEqual(
      expect.objectContaining({
        name: expect.stringContaining("Screenshot"),
        source: expect.any(String),
        type: ContentType.PNG,
      }),
    );
  });

  await check("verifies screenshot attachment bytes are available", () => {
    expect(screenshotAttachment?.source && attachments[screenshotAttachment.source]).toBeInstanceOf(Buffer);
  });
});

it("attaches screenshots from failed tests", async () => {
  const { tests, attachments } = await runTestCafeInlineTest(
    {
      "pages/basic.html": "<html><body><h1>Allure TestCafe</h1></body></html>",
      "tests/screenshots.test.js": `
        fixture\`Screenshot fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("fails with screenshot", async t => {
          await t.expect(1).eql(2);
        });
      `,
    },
    {
      screenshots: true,
    },
  );

  const failed = tests.find(({ name }) => name === "fails with screenshot");
  const failedExpectationStep = findStepByName(failed?.steps ?? [], /^expect\(1\)\.eql\(2\)$/);
  const screenshotAttachment = failedExpectationStep?.attachments?.find(({ type }) => type === ContentType.PNG);

  await check("verifies failed tests include screenshot attachments", () => {
    expect(failed).toEqual(
      expect.objectContaining({
        status: Status.FAILED,
      }),
    );
    expect(failedExpectationStep).toEqual(expect.objectContaining({ status: Status.FAILED }));
    expect(screenshotAttachment?.name).toContain("Screenshot");
    expect(screenshotAttachment?.source).toBeTruthy();
  });

  await check("verifies screenshot bytes are attached for failed tests", () => {
    expect(screenshotAttachment?.source && attachments[screenshotAttachment.source]).toBeInstanceOf(Buffer);
  });
});
