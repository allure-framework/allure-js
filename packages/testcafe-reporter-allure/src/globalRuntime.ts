import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

import type { AllureTestCafeRuntimeEnvelope, TestCafeTestRunTrackerModule } from "./model.js";
import { createRuntimeAttachmentEnvelope } from "./utils.js";

type TestCafeTestRunTrackerImport = TestCafeTestRunTrackerModule & {
  default?: TestCafeTestRunTrackerModule;
};

type TestCafeModuleImport = {
  t?: {
    report?: (value: unknown) => PromiseLike<unknown> | unknown;
  };
  default?: TestCafeModuleImport;
};

let globalRuntime: AllureTestCafeGlobalRuntime | undefined;
let testRunTrackerCache: TestCafeTestRunTrackerModule | null | undefined;
let testRunTrackerPromise: Promise<TestCafeTestRunTrackerModule | null> | undefined;
let testCafeModuleCache: TestCafeModuleImport | null | undefined;
let testCafeModulePromise: Promise<TestCafeModuleImport | null> | undefined;

const getTestRunTracker = (value: TestCafeTestRunTrackerImport) => {
  return typeof value.resolveContextTestRun === "function" || value.activeTestRuns ? value : (value.default ?? null);
};

const loadTestRunTracker = async () => {
  if (testRunTrackerCache !== undefined) {
    return testRunTrackerCache;
  }

  if (typeof require === "function") {
    try {
      const testRunTracker = require("testcafe/lib/api/test-run-tracker") as TestCafeTestRunTrackerModule;

      testRunTrackerCache = getTestRunTracker(testRunTracker);
      return testRunTrackerCache;
    } catch {
      testRunTrackerCache = null;
      return testRunTrackerCache;
    }
  }

  testRunTrackerPromise ??= import("testcafe/lib/api/test-run-tracker")
    .then((testRunTracker) => getTestRunTracker(testRunTracker as unknown as TestCafeTestRunTrackerImport))
    .catch(() => null)
    .then((testRunTracker) => {
      testRunTrackerCache = testRunTracker;
      return testRunTracker;
    });

  return await testRunTrackerPromise;
};

const getTestCafeModule = (value: TestCafeModuleImport) => {
  return value?.t?.report ? value : (value.default ?? null);
};

const loadTestCafeModule = async () => {
  if (testCafeModuleCache !== undefined) {
    return testCafeModuleCache;
  }

  if (typeof require === "function") {
    try {
      const testCafeModule = require("testcafe") as TestCafeModuleImport;

      testCafeModuleCache = getTestCafeModule(testCafeModule);
      return testCafeModuleCache;
    } catch {
      testCafeModuleCache = null;
      return testCafeModuleCache;
    }
  }

  testCafeModulePromise ??= import("testcafe")
    .then((testCafeModule) => getTestCafeModule(testCafeModule as unknown as TestCafeModuleImport))
    .catch(() => null)
    .then((testCafeModule) => {
      testCafeModuleCache = testCafeModule;
      return testCafeModule;
    });

  return await testCafeModulePromise;
};

const resolveCurrentTestRun = async () => {
  try {
    const testRunTracker = await loadTestRunTracker();
    const currentTestRun = testRunTracker?.resolveContextTestRun?.();

    if (currentTestRun) {
      return currentTestRun;
    }

    const activeTestRuns = Object.values(testRunTracker?.activeTestRuns ?? {});

    return activeTestRuns.length === 1 ? activeTestRuns[0] : undefined;
  } catch {
    return undefined;
  }
};

const addRuntimeEnvelopeToCurrentTestRun = async (envelope: AllureTestCafeRuntimeEnvelope) => {
  const currentTestRun = await resolveCurrentTestRun();

  if (!currentTestRun?.reportDataLog?.addData) {
    return false;
  }

  await currentTestRun.reportDataLog.addData([envelope]);
  return true;
};

const reportRuntimeEnvelopeThroughTestController = async (envelope: AllureTestCafeRuntimeEnvelope) => {
  const testCafeModule = await loadTestCafeModule();

  if (!testCafeModule?.t?.report) {
    return false;
  }

  try {
    await testCafeModule.t.report(envelope);
    return true;
  } catch {
    return false;
  }
};

export const addRuntimeMessageToCurrentTestRun = async (message: RuntimeMessage) => {
  const envelope = createRuntimeAttachmentEnvelope(message);

  if (await addRuntimeEnvelopeToCurrentTestRun(envelope)) {
    return true;
  }

  return await reportRuntimeEnvelopeThroughTestController(envelope);
};

class AllureTestCafeGlobalRuntime extends MessageTestRuntime {
  async sendMessage(message: RuntimeMessage) {
    await addRuntimeMessageToCurrentTestRun(message);
  }
}

export const installGlobalTestRuntime = () => {
  globalRuntime ??= new AllureTestCafeGlobalRuntime();
  setGlobalTestRuntime(globalRuntime);
};
