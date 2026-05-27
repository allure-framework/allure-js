import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, getRelativePath, includedInTestPlan, parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

import { importAvaLib } from "./avaInternals.js";
import { AllureAvaTestRuntime, runWithRuntimeContext, setRuntimeMessageSender } from "./runtime.js";
import type { AllureAvaGlobalRuntimeMessageEvent, AllureAvaRuntimeMessageEvent } from "./types.js";

const RUN_SINGLE_PATCHED = Symbol.for("allure-ava.patched-runner-run-single");
const TEST_PLAN_PATCHED = Symbol.for("allure-ava.patched-runner-test-plan");

type AvaChannelModule = {
  send: (event: AllureAvaRuntimeMessageEvent | AllureAvaGlobalRuntimeMessageEvent) => void;
};

type AvaTask = {
  title?: string;
  metadata?: {
    selected?: boolean;
  };
};

type AvaTasks = {
  concurrent?: AvaTask[];
  serial?: AvaTask[];
  todo?: AvaTask[];
};

type AvaRunnerPrototype = {
  file?: string;
  runSingle: (runnable: any) => Promise<any>;
  start: () => Promise<void>;
  tasks?: AvaTasks;
  [RUN_SINGLE_PATCHED]?: boolean;
  [TEST_PLAN_PATCHED]?: boolean;
};

type AvaRunnerConstructor = {
  default: {
    prototype: AvaRunnerPrototype;
  };
};

const getLogicalTitle = (title: string) => extractMetadataFromString(title).cleanTitle || title;

const getFullName = (testFile: string, title: string) =>
  `${getPosixPath(getRelativePath(testFile))}#${getLogicalTitle(title)}`;

const shouldRunTask = (testPlan: TestPlanV1, testFile: string, task: AvaTask) => {
  if (!task.title) {
    return false;
  }

  return includedInTestPlan(testPlan, {
    fullName: getFullName(testFile, task.title),
    tags: [task.title],
  });
};

const filterTaskListByTestPlan = (testPlan: TestPlanV1, testFile: string, tasks: AvaTask[] | undefined) => {
  for (const task of tasks ?? []) {
    if (task.metadata?.selected) {
      task.metadata.selected = shouldRunTask(testPlan, testFile, task);
    }
  }
};

const applyTestPlanFilter = (runner: AvaRunnerPrototype, testPlan: TestPlanV1) => {
  const testFile = runner.file;

  if (!testFile) {
    return;
  }

  filterTaskListByTestPlan(testPlan, testFile, runner.tasks?.serial);
  filterTaskListByTestPlan(testPlan, testFile, runner.tasks?.concurrent);
  filterTaskListByTestPlan(testPlan, testFile, runner.tasks?.todo);
};

const installRunnerPatch = async () => {
  const { default: Runner } = await importAvaLib<AvaRunnerConstructor>("lib", "runner.js");
  const prototype = Runner.prototype;

  if (!prototype[RUN_SINGLE_PATCHED]) {
    // runSingle is the narrow worker-side boundary for both tests and hooks,
    // which lets AsyncLocalStorage scope runtime API calls without wrapping user code.
    const originalRunSingle = prototype.runSingle;

    prototype.runSingle = function allureAvaRunSingle(this: unknown, runnable: any) {
      return runWithRuntimeContext(
        {
          title: typeof runnable?.title === "string" ? runnable.title : undefined,
          isHook: runnable?.isHook === true,
        },
        () => originalRunSingle.call(this, runnable),
      );
    };

    prototype[RUN_SINGLE_PATCHED] = true;
  }

  const testPlan = parseTestPlan();

  if (testPlan && !prototype[TEST_PLAN_PATCHED]) {
    const originalStart = prototype.start;

    prototype.start = function allureAvaStart(this: AvaRunnerPrototype) {
      applyTestPlanFilter(this, testPlan);

      return originalStart.call(this);
    };

    prototype[TEST_PLAN_PATCHED] = true;
  }
};

const importAvaChannel = async (): Promise<AvaChannelModule> => {
  try {
    return await importAvaLib<AvaChannelModule>("lib", "worker", "channel.js");
  } catch {
    const channel = await importAvaLib<Partial<AvaChannelModule> & { default?: AvaChannelModule }>(
      "lib",
      "worker",
      "channel.cjs",
    );

    return typeof channel.send === "function" ? (channel as AvaChannelModule) : channel.default!;
  }
};

export default async function setupAllureAva() {
  const channel = await importAvaChannel();

  setRuntimeMessageSender((event) => channel.send(event));
  setGlobalTestRuntime(new AllureAvaTestRuntime());
  await installRunnerPatch();
}
