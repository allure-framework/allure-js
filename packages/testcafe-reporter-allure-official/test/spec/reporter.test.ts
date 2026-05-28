import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import type {
  AllureTestCafeReporterConfig,
  TestCafeReporterActionInfo,
  TestCafeReporterDataInfo,
  TestCafeReporterWarningInfo,
} from "../../src/model.js";
import { createReporterObject } from "../../src/reporter.js";
import { createRuntimeAttachmentEnvelope } from "../../src/utils.js";
import { createTempFixtureDir, PACKAGE_ROOT, readAllureResultsDir } from "../utils.js";

type ManualReporterRunOptions = {
  reporterConfig?: Omit<AllureTestCafeReporterConfig, "resultsDir">;
  fixturePath?: string;
  fixtureName?: string;
  fixtureMeta?: Record<string, unknown>;
  testName?: string;
  testMeta?: Record<string, unknown>;
  testStartInfo?: Record<string, unknown>;
  testRunInfo?: Record<string, unknown>;
  actionEvents?: Array<{
    type: "start" | "done";
    apiActionName: string;
    info: TestCafeReporterActionInfo;
  }>;
  reportDataEvents?: Array<{
    testRunInfo: TestCafeReporterDataInfo;
    data: unknown[];
  }>;
  warningEvents?: TestCafeReporterWarningInfo[];
  events?: Array<
    | {
        type: "action-start" | "action-done";
        apiActionName: string;
        info: TestCafeReporterActionInfo;
      }
    | {
        type: "report-data";
        testRunInfo: TestCafeReporterDataInfo;
        data: unknown[];
      }
    | {
        type: "warning";
        warningInfo: TestCafeReporterWarningInfo;
      }
  >;
  context?: { formatError?: (error: unknown, prefix?: string) => string };
};

const runReporterLifecycle = async ({
  reporterConfig = {},
  fixturePath = join(PACKAGE_ROOT, "test", "fixtures", "manual.test.js"),
  fixtureName = "Manual fixture",
  fixtureMeta = {},
  testName = "manual test",
  testMeta = {},
  testStartInfo = {
    testId: "manual-id",
    startTime: new Date("2024-01-01T00:00:00.000Z"),
    testRunIds: ["run-1"],
  },
  testRunInfo = {
    errs: [],
    warnings: [],
    durationMs: 5,
  },
  actionEvents = [],
  reportDataEvents = [],
  warningEvents = [],
  events = [],
  context = {},
}: ManualReporterRunOptions = {}) => {
  const runDir = await createTempFixtureDir();
  const resultsDir = join(runDir, "allure-results");

  await mkdir(resultsDir, { recursive: true });

  const reporter = createReporterObject({
    ...reporterConfig,
    resultsDir,
  });

  try {
    reporter.init?.("3.7.2");
    await reporter.reportFixtureStart?.(fixtureName, fixturePath, fixtureMeta);
    await reporter.reportTestStart?.(testName, testMeta, testStartInfo);
    if (events.length > 0) {
      for (const event of events) {
        if (event.type === "action-start") {
          await reporter.reportTestActionStart?.(event.apiActionName, event.info);
          continue;
        }

        if (event.type === "action-done") {
          await reporter.reportTestActionDone?.(event.apiActionName, event.info);
          continue;
        }

        if (event.type === "warning") {
          await reporter.reportWarnings?.(event.warningInfo);
          continue;
        }

        await reporter.reportData?.(event.testRunInfo, ...event.data);
      }
    } else {
      for (const actionEvent of actionEvents) {
        if (actionEvent.type === "start") {
          await reporter.reportTestActionStart?.(actionEvent.apiActionName, actionEvent.info);
        } else {
          await reporter.reportTestActionDone?.(actionEvent.apiActionName, actionEvent.info);
        }
      }
      for (const reportDataEvent of reportDataEvents) {
        await reporter.reportData?.(reportDataEvent.testRunInfo, ...reportDataEvent.data);
      }
      for (const warningEvent of warningEvents) {
        await reporter.reportWarnings?.(warningEvent);
      }
    }
    await reporter.reportTestDone?.call(context, testName, testRunInfo as any, testMeta);
    await reporter.reportTaskDone?.(new Date("2024-01-01T00:00:01.000Z"), 1, [], {
      passedCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });

    return await readAllureResultsDir(resultsDir);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
};

it("writes warnings, quarantine details, browser parameters, categories, and environment info", async () => {
  const { tests, envInfo, categories, attachments } = await runReporterLifecycle({
    reporterConfig: {
      categories: [{ name: "Known", messageRegex: /warning/ }],
      environmentInfo: { branch: "main", target: "staging" },
    },
    testRunInfo: {
      errs: [],
      warnings: ["warn one", "warn two"],
      durationMs: 9,
      unstable: true,
      browsers: [{ testRunId: "run-1", prettyUserAgent: "Chrome 123 / Linux" }],
      quarantine: {
        1: { passed: false },
        2: { passed: true },
      },
    },
  });

  expect(envInfo).toEqual({
    branch: "main",
    target: "staging",
  });
  expect(categories).toEqual([{ name: "Known", messageRegex: "warning" }]);

  const [testResult] = tests;

  expect(testResult).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      labels: expect.arrayContaining([{ name: LabelName.TAG, value: "unstable" }]),
      parameters: expect.arrayContaining([{ name: "Browser", value: "Chrome 123 / Linux" }]),
      attachments: expect.arrayContaining([
        expect.objectContaining({ name: "Warnings", type: ContentType.TEXT }),
        expect.objectContaining({ name: "Quarantine", type: ContentType.JSON }),
      ]),
    }),
  );

  testResult.attachments.forEach((attachment) => {
    expect(attachments).toHaveProperty(attachment.source);
  });
});

it("calls formatError with the reporter context bound", async () => {
  const { tests } = await runReporterLifecycle({
    testRunInfo: {
      errs: [{ message: "boom" }],
      warnings: [],
      durationMs: 9,
    },
    context: {
      viewportWidth: 1280,
      formatError(this: { viewportWidth: number }, error: { message: string }) {
        return `${this.viewportWidth}:${error.message}`;
      },
    } as any,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].statusDetails).toEqual(
    expect.objectContaining({
      message: "boom",
      trace: "1280:boom",
    }),
  );
});

it("creates automatic action steps, filters report actions, and keeps assertion failures on the step", async () => {
  const assertionError = {
    name: "AssertionError",
    message: "expected 1 to equal 2",
    actual: "1",
    expected: "2",
    stack: "AssertionError: expected 1 to equal 2",
  };

  const actionBaseInfo = {
    testRunId: "run-1",
    test: { id: "manual-id", name: "manual test" },
    fixture: { id: "fixture-id", name: "Manual fixture" },
  } satisfies Omit<TestCafeReporterActionInfo, "command">;

  const { tests } = await runReporterLifecycle({
    actionEvents: [
      {
        type: "start",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
      {
        type: "done",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          duration: 7,
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
      {
        type: "start",
        apiActionName: "report",
        info: {
          ...actionBaseInfo,
          command: { type: "report", actionId: "report-1" },
        },
      },
      {
        type: "done",
        apiActionName: "report",
        info: {
          ...actionBaseInfo,
          duration: 1,
          command: { type: "report", actionId: "report-1" },
        },
      },
      {
        type: "start",
        apiActionName: "eql",
        info: {
          ...actionBaseInfo,
          command: { type: "assertion", actionId: "assert-1", actual: 1, expected: 2 },
        },
      },
      {
        type: "done",
        apiActionName: "eql",
        info: {
          ...actionBaseInfo,
          duration: 2,
          err: assertionError,
          command: { type: "assertion", actionId: "assert-1", actual: 1, expected: 2 },
        },
      },
    ],
    testRunInfo: {
      errs: [assertionError],
      warnings: [],
      durationMs: 9,
    },
  });

  const [testResult] = tests;

  expect(testResult.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "click(#submit)",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "expect(1).eql(2)",
        status: Status.FAILED,
        statusDetails: expect.objectContaining({
          actual: "1",
          expected: "2",
        }),
      }),
    ]),
  );
  expect(testResult.steps).not.toContainEqual(expect.objectContaining({ name: "report()" }));
});

it("replays runtime messages live so automatic action steps can nest inside explicit runtime steps", async () => {
  const actionBaseInfo = {
    testRunId: "run-1",
    test: { id: "manual-id", name: "manual test" },
    fixture: { id: "fixture-id", name: "Manual fixture" },
  } satisfies Omit<TestCafeReporterActionInfo, "command">;

  const { tests } = await runReporterLifecycle({
    events: [
      {
        type: "report-data",
        testRunInfo: {
          testRunId: "run-1",
        },
        data: [
          createRuntimeAttachmentEnvelope({
            type: "step_start",
            data: { name: "Outer step", start: 1 },
          }),
        ],
      },
      {
        type: "action-start",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
      {
        type: "action-done",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          duration: 5,
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
      {
        type: "report-data",
        testRunInfo: {
          testRunId: "run-1",
        },
        data: [
          createRuntimeAttachmentEnvelope({
            type: "step_stop",
            data: { status: Status.PASSED, stop: 2 },
          }),
        ],
      },
    ],
  });

  const [testResult] = tests;
  const [outerStep] = testResult.steps;

  expect(outerStep).toEqual(
    expect.objectContaining({
      name: "Outer step",
      steps: [expect.objectContaining({ name: "click(#submit)", status: Status.PASSED })],
    }),
  );
});

it("creates separate browser-scoped results for multi-browser runtime messages", async () => {
  const { tests } = await runReporterLifecycle({
    testStartInfo: {
      testId: "manual-id",
      startTime: new Date("2024-01-01T00:00:00.000Z"),
      testRunIds: ["run-a", "run-b"],
    },
    testRunInfo: {
      errs: [],
      warnings: [],
      durationMs: 9,
      browsers: [
        { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
        { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
      ],
      reportData: {
        "run-a": [
          createRuntimeAttachmentEnvelope({
            type: "step_start",
            data: { name: "chrome step", start: 1 },
          }),
          createRuntimeAttachmentEnvelope({
            type: "step_stop",
            data: { status: Status.PASSED, stop: 2 },
          }),
        ],
        "run-b": [
          createRuntimeAttachmentEnvelope({
            type: "step_start",
            data: { name: "edge step", start: 3 },
          }),
          createRuntimeAttachmentEnvelope({
            type: "step_stop",
            data: { status: Status.PASSED, stop: 4 },
          }),
        ],
      },
    },
  });

  expect(tests).toHaveLength(2);

  const chromeResult = tests.find(({ parameters }) =>
    parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Chrome 123 / Linux"),
  );
  const edgeResult = tests.find(({ parameters }) =>
    parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Edge 123 / Linux"),
  );

  expect(chromeResult?.attachments).not.toContainEqual(expect.objectContaining({ name: "Runtime messages" }));
  expect(edgeResult?.attachments).not.toContainEqual(expect.objectContaining({ name: "Runtime messages" }));
  expect(chromeResult?.steps).toEqual([expect.objectContaining({ name: "chrome step", status: Status.PASSED })]);
  expect(edgeResult?.steps).toEqual([expect.objectContaining({ name: "edge step", status: Status.PASSED })]);
});

it("keeps runtime messages on the matching run even when browser metadata is partial", async () => {
  const { tests } = await runReporterLifecycle({
    testStartInfo: {
      testId: "manual-id",
      startTime: new Date("2024-01-01T00:00:00.000Z"),
      testRunIds: ["run-a", "run-b"],
    },
    testRunInfo: {
      errs: [],
      warnings: [],
      durationMs: 9,
      browsers: [{ testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" }],
      reportData: {
        "run-a": [createRuntimeAttachmentEnvelope({ type: "metadata", data: { description: "from a" } })],
        "run-b": [createRuntimeAttachmentEnvelope({ type: "metadata", data: { descriptionHtml: "<b>from b</b>" } })],
      },
    },
  });

  expect(tests).toHaveLength(2);

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        description: "from a",
        parameters: expect.arrayContaining([{ name: "Browser", value: "Chrome 123 / Linux" }]),
      }),
      expect.objectContaining({
        descriptionHtml: "<b>from b</b>",
      }),
    ]),
  );
});

it("creates live action steps for each browser run", async () => {
  const actionBaseInfo = {
    test: { id: "manual-id", name: "manual test" },
    fixture: { id: "fixture-id", name: "Manual fixture" },
  } satisfies Omit<TestCafeReporterActionInfo, "command" | "testRunId">;

  const { tests } = await runReporterLifecycle({
    testStartInfo: {
      testId: "manual-id",
      startTime: new Date("2024-01-01T00:00:00.000Z"),
      testRunIds: ["run-a", "run-b"],
    },
    actionEvents: [
      {
        type: "start",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          testRunId: "run-a",
          browser: { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
          command: { type: "click", actionId: "click-a", selector: { expression: "#submit" } },
        },
      },
      {
        type: "done",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          testRunId: "run-a",
          browser: { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
          duration: 4,
          command: { type: "click", actionId: "click-a", selector: { expression: "#submit" } },
        },
      },
      {
        type: "start",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          testRunId: "run-b",
          browser: { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
          command: { type: "click", actionId: "click-b", selector: { expression: "#submit" } },
        },
      },
      {
        type: "done",
        apiActionName: "click",
        info: {
          ...actionBaseInfo,
          testRunId: "run-b",
          browser: { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
          duration: 5,
          command: { type: "click", actionId: "click-b", selector: { expression: "#submit" } },
        },
      },
    ],
    testRunInfo: {
      errs: [],
      warnings: [],
      durationMs: 9,
      browsers: [
        { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
        { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
      ],
    },
  });

  expect(tests).toHaveLength(2);

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        parameters: expect.arrayContaining([{ name: "Browser", value: "Chrome 123 / Linux" }]),
        steps: [expect.objectContaining({ name: "click(#submit)", status: Status.PASSED })],
      }),
      expect.objectContaining({
        parameters: expect.arrayContaining([{ name: "Browser", value: "Edge 123 / Linux" }]),
        steps: [expect.objectContaining({ name: "click(#submit)", status: Status.PASSED })],
      }),
    ]),
  );
});

it("attributes multi-browser screenshots by screenshot testRunId", async () => {
  const screenshotDir = await createTempFixtureDir("manual-screenshot-attribution");
  const chromeScreenshotPath = join(screenshotDir, "chrome.png");
  const edgeScreenshotPath = join(screenshotDir, "edge.png");
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s4m7xUAAAAASUVORK5CYII=",
    "base64",
  );

  await writeFile(chromeScreenshotPath, pngBuffer);
  await writeFile(edgeScreenshotPath, pngBuffer);

  try {
    const { tests } = await runReporterLifecycle({
      testStartInfo: {
        testId: "manual-id",
        startTime: new Date("2024-01-01T00:00:00.000Z"),
        testRunIds: ["run-a", "run-b"],
      },
      testRunInfo: {
        errs: [],
        warnings: [],
        durationMs: 9,
        browsers: [
          { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
          { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
        ],
        screenshots: [
          {
            testRunId: "run-a",
            screenshotPath: chromeScreenshotPath,
            userAgent: "Shared Browser",
          },
          {
            testRunId: "run-b",
            screenshotPath: edgeScreenshotPath,
            userAgent: "Shared Browser",
          },
        ],
      },
    });

    expect(tests).toHaveLength(2);
    expect(
      tests
        .find(({ parameters }) =>
          parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Chrome 123 / Linux"),
        )
        ?.attachments.filter(({ type }) => type === ContentType.PNG),
    ).toEqual([expect.objectContaining({ name: "Screenshot 1 - Shared Browser" })]);
    expect(
      tests
        .find(({ parameters }) =>
          parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Edge 123 / Linux"),
        )
        ?.attachments.filter(({ type }) => type === ContentType.PNG),
    ).toEqual([expect.objectContaining({ name: "Screenshot 1 - Shared Browser" })]);
  } finally {
    await rm(screenshotDir, { recursive: true, force: true });
  }
});

it("attaches screenshots to the matching action step when TestCafe provides actionId", async () => {
  const screenshotDir = await createTempFixtureDir("manual-screenshot-step-attribution");
  const chromeScreenshotPath = join(screenshotDir, "chrome.png");
  const edgeScreenshotPath = join(screenshotDir, "edge.png");
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s4m7xUAAAAASUVORK5CYII=",
    "base64",
  );

  await writeFile(chromeScreenshotPath, pngBuffer);
  await writeFile(edgeScreenshotPath, pngBuffer);

  try {
    const { tests, attachments } = await runReporterLifecycle({
      testStartInfo: {
        testId: "manual-id",
        startTime: new Date("2024-01-01T00:00:00.000Z"),
        testRunIds: ["run-a", "run-b"],
      },
      actionEvents: [
        {
          type: "start",
          apiActionName: "takeScreenshot",
          info: {
            testRunId: "run-a",
            test: { id: "manual-id", name: "manual test" },
            fixture: { id: "fixture-id", name: "Manual fixture" },
            command: { type: "takeScreenshot", actionId: "shot-a", path: "chrome.png" },
          },
        },
        {
          type: "done",
          apiActionName: "takeScreenshot",
          info: {
            testRunId: "run-a",
            test: { id: "manual-id", name: "manual test" },
            fixture: { id: "fixture-id", name: "Manual fixture" },
            duration: 4,
            command: { type: "takeScreenshot", actionId: "shot-a", path: "chrome.png" },
          },
        },
        {
          type: "start",
          apiActionName: "takeScreenshot",
          info: {
            testRunId: "run-b",
            test: { id: "manual-id", name: "manual test" },
            fixture: { id: "fixture-id", name: "Manual fixture" },
            command: { type: "takeScreenshot", actionId: "shot-b", path: "edge.png" },
          },
        },
        {
          type: "done",
          apiActionName: "takeScreenshot",
          info: {
            testRunId: "run-b",
            test: { id: "manual-id", name: "manual test" },
            fixture: { id: "fixture-id", name: "Manual fixture" },
            duration: 5,
            command: { type: "takeScreenshot", actionId: "shot-b", path: "edge.png" },
          },
        },
      ],
      testRunInfo: {
        errs: [],
        warnings: [],
        durationMs: 9,
        browsers: [
          { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
          { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
        ],
        screenshots: [
          {
            testRunId: "run-a",
            screenshotPath: chromeScreenshotPath,
            actionId: "shot-a",
          },
          {
            testRunId: "run-b",
            screenshotPath: edgeScreenshotPath,
            actionId: "shot-b",
          },
        ],
      },
    });

    const chromeResult = tests.find(({ parameters }) =>
      parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Chrome 123 / Linux"),
    );
    const edgeResult = tests.find(({ parameters }) =>
      parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Edge 123 / Linux"),
    );
    const chromeStepAttachment = chromeResult?.steps[0]?.attachments?.[0];
    const edgeStepAttachment = edgeResult?.steps[0]?.attachments?.[0];

    expect(chromeResult?.attachments).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: ContentType.PNG })]),
    );
    expect(edgeResult?.attachments).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: ContentType.PNG })]),
    );
    expect(chromeStepAttachment).toEqual(expect.objectContaining({ name: "Screenshot 1", type: ContentType.PNG }));
    expect(edgeStepAttachment).toEqual(expect.objectContaining({ name: "Screenshot 1", type: ContentType.PNG }));
    expect(chromeStepAttachment?.source && attachments[chromeStepAttachment.source]).toEqual(pngBuffer);
    expect(edgeStepAttachment?.source && attachments[edgeStepAttachment.source]).toEqual(pngBuffer);
  } finally {
    await rm(screenshotDir, { recursive: true, force: true });
  }
});

it("attributes multi-browser videos by video testRunId", async () => {
  const videoDir = await createTempFixtureDir("manual-video-attribution");
  const chromeVideoPath = join(videoDir, "chrome.mp4");
  const edgeVideoPath = join(videoDir, "edge.mp4");
  const videoBuffer = Buffer.from("fake mp4 payload", "utf8");

  await writeFile(chromeVideoPath, videoBuffer);
  await writeFile(edgeVideoPath, videoBuffer);

  try {
    const { tests, attachments } = await runReporterLifecycle({
      testStartInfo: {
        testId: "manual-id",
        startTime: new Date("2024-01-01T00:00:00.000Z"),
        testRunIds: ["run-a", "run-b"],
      },
      testRunInfo: {
        errs: [],
        warnings: [],
        durationMs: 9,
        browsers: [
          { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
          { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
        ],
        videos: [
          {
            testRunId: "run-a",
            videoPath: chromeVideoPath,
            singleFile: false,
          },
          {
            testRunId: "run-b",
            videoPath: edgeVideoPath,
            singleFile: false,
          },
        ],
      },
    });

    expect(tests).toHaveLength(2);

    const chromeResult = tests.find(({ parameters }) =>
      parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Chrome 123 / Linux"),
    );
    const edgeResult = tests.find(({ parameters }) =>
      parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Edge 123 / Linux"),
    );
    const chromeVideo = chromeResult?.attachments.find(({ type }) => type === ContentType.MP4);
    const edgeVideo = edgeResult?.attachments.find(({ type }) => type === ContentType.MP4);

    expect(chromeVideo).toEqual(expect.objectContaining({ name: "Video 1", type: ContentType.MP4 }));
    expect(edgeVideo).toEqual(expect.objectContaining({ name: "Video 1", type: ContentType.MP4 }));
    expect(chromeVideo?.source && attachments[chromeVideo.source]).toEqual(videoBuffer);
    expect(edgeVideo?.source && attachments[edgeVideo.source]).toEqual(videoBuffer);
  } finally {
    await rm(videoDir, { recursive: true, force: true });
  }
});

it("routes warnings to the matching browser run and action step", async () => {
  const { tests, attachments } = await runReporterLifecycle({
    testStartInfo: {
      testId: "manual-id",
      startTime: new Date("2024-01-01T00:00:00.000Z"),
      testRunIds: ["run-a", "run-b"],
    },
    actionEvents: [
      {
        type: "start",
        apiActionName: "click",
        info: {
          testRunId: "run-b",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          command: { type: "click", actionId: "click-b", selector: { expression: "#submit" } },
        },
      },
      {
        type: "done",
        apiActionName: "click",
        info: {
          testRunId: "run-b",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          duration: 5,
          command: { type: "click", actionId: "click-b", selector: { expression: "#submit" } },
        },
      },
    ],
    warningEvents: [
      { message: "warn a", testRunId: "run-a" },
      { message: "warn b", testRunId: "run-b", actionId: "click-b" },
    ],
    testRunInfo: {
      errs: [],
      warnings: ["warn a", "warn b"],
      durationMs: 9,
      browsers: [
        { testRunId: "run-a", prettyUserAgent: "Chrome 123 / Linux" },
        { testRunId: "run-b", prettyUserAgent: "Edge 123 / Linux" },
      ],
    },
  });

  const chromeResult = tests.find(({ parameters }) =>
    parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Chrome 123 / Linux"),
  );
  const edgeResult = tests.find(({ parameters }) =>
    parameters.some((parameter) => parameter.name === "Browser" && parameter.value === "Edge 123 / Linux"),
  );
  const chromeWarning = chromeResult?.attachments.find(({ name }) => name === "Warnings");
  const edgeStepWarning = edgeResult?.steps[0]?.attachments?.find(({ name }) => name === "Warnings");

  expect(chromeWarning?.source && attachments[chromeWarning.source].toString("utf8")).toBe("warn a");
  expect(edgeStepWarning?.source && attachments[edgeStepWarning.source].toString("utf8")).toBe("warn b");
  expect(edgeResult?.attachments).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "Warnings" })]));
});

it("can disable automatic action steps without affecting the rest of the reporter", async () => {
  const { tests } = await runReporterLifecycle({
    reporterConfig: {
      captureActionsAsSteps: false,
    },
    actionEvents: [
      {
        type: "start",
        apiActionName: "click",
        info: {
          testRunId: "run-1",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
      {
        type: "done",
        apiActionName: "click",
        info: {
          testRunId: "run-1",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          duration: 5,
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
    ],
  });

  expect(tests[0].steps).toHaveLength(0);
});

it("formats useRole steps and skips missing screenshot attachments", async () => {
  const { tests } = await runReporterLifecycle({
    actionEvents: [
      {
        type: "start",
        apiActionName: "useRole",
        info: {
          testRunId: "run-1",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          command: {
            type: "useRole",
            actionId: "role-1",
            role: {
              loginUrl: "https://example.test/login",
            },
          },
        } as any,
      },
      {
        type: "done",
        apiActionName: "useRole",
        info: {
          testRunId: "run-1",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          duration: 4,
          command: {
            type: "useRole",
            actionId: "role-1",
            role: {
              loginUrl: "https://example.test/login",
            },
          },
        } as any,
      },
    ],
    testRunInfo: {
      errs: [],
      warnings: [],
      durationMs: 9,
      screenshots: [
        {
          screenshotPath: join(PACKAGE_ROOT, "test", "fixtures", "missing.png"),
        },
      ],
    },
  });

  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "useRole(https://example.test/login)",
      status: Status.PASSED,
    }),
  ]);
  expect(tests[0].attachments).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ type: ContentType.PNG })]),
  );
});

it("marks unfinished action steps as broken when the test ends mid-action", async () => {
  const { tests } = await runReporterLifecycle({
    actionEvents: [
      {
        type: "start",
        apiActionName: "click",
        info: {
          testRunId: "run-1",
          test: { id: "manual-id", name: "manual test" },
          fixture: { id: "fixture-id", name: "Manual fixture" },
          command: { type: "click", actionId: "click-1", selector: { expression: "#submit" } },
        },
      },
    ],
    testRunInfo: {
      errs: [{ message: "boom" }],
      warnings: [],
      durationMs: 9,
    },
  });

  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "click(#submit)",
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: "Test finished before the TestCafe action step completed",
      }),
    }),
  ]);
});

it("strips ANSI error text in status details", async () => {
  const { tests, attachments } = await runReporterLifecycle({
    testRunInfo: {
      errs: [
        {
          message: "\u001B[31mboom\u001B[39m",
          stack: "\u001B[31mstack boom\u001B[39m",
        },
      ],
      warnings: [],
      durationMs: 9,
    },
  });

  expect(tests[0].statusDetails).toEqual(
    expect.objectContaining({
      message: "boom",
      trace: "stack boom",
    }),
  );
  expect(
    Object.values(attachments)
      .map((value) => value.toString("utf8"))
      .join("\n"),
  ).not.toContain("\u001B[31m");
});

it("prefers the original error message and stack when TestCafe exposes originError", async () => {
  const { tests, attachments } = await runReporterLifecycle({
    context: {
      formatError() {
        return "formatted testcafe block";
      },
    } as any,
    testRunInfo: {
      errs: [
        {
          code: "E2",
          errMsg: "Error: boom",
          originError: {
            message: "boom",
            stack: "Error: boom\n    at runtime.test.js:10:5",
          },
        },
      ],
      warnings: [],
      durationMs: 9,
    },
  });

  expect(tests[0].statusDetails).toEqual(
    expect.objectContaining({
      message: "Error: boom",
      trace: "Error: boom\n    at runtime.test.js:10:5",
    }),
  );
  expect(tests[0].statusDetails?.message).not.toBe(tests[0].statusDetails?.trace);
  expect(Object.values(attachments).map((value) => value.toString("utf8"))).toContain("formatted testcafe block");
});

it("falls back to stringified status details for non-Error throw shapes", async () => {
  const { tests } = await runReporterLifecycle({
    testRunInfo: {
      errs: ["plain failure"],
      warnings: [],
      durationMs: 9,
    },
  });

  expect(tests[0]).toEqual(
    expect.objectContaining({
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: "plain failure",
        trace: "plain failure",
      }),
    }),
  );
});
