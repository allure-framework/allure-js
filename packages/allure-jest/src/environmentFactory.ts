import type { EnvironmentContext, JestEnvironment } from "@jest/environment";
import type { Circus } from "@jest/types";
import os from "node:os";
import { dirname, sep } from "node:path";
import process from "node:process";
import * as allure from "allure-js-commons";
import { LabelName, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import { FileSystemWriter, MessageWriter, ReporterRuntime, getSuiteLabels } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureJestTestRuntime } from "./AllureJestTestRuntime.js";
import type { AllureJestConfig, AllureJestEnvironment, RunContext } from "./model.js";
import { getTestId, getTestPath, last, shouldHookBeSkipped } from "./utils.js";

const { ALLURE_TEST_MODE, ALLURE_HOST_NAME, ALLURE_THREAD_NAME, JEST_WORKER_ID } = process.env;
const hostname = os.hostname();

const createJestEnvironment = <T extends typeof JestEnvironment>(Base: T): T => {
  // @ts-expect-error (ts(2545)) Incorrect assumption about a mixin class: https://github.com/microsoft/TypeScript/issues/37142
  return class extends Base {
    jestState?: Circus.State;
    testPath: string;
    runtime: ReporterRuntime;
    runContext: RunContext = {
      executables: [],
      steps: [],
      scopes: [],
    };

    constructor(config: AllureJestConfig, context: EnvironmentContext) {
      super(config, context);
      const { resultsDir = "allure-results", ...restConfig } = config?.projectConfig?.testEnvironmentOptions || {};

      this.runtime = new ReporterRuntime({
        ...restConfig,
        writer: ALLURE_TEST_MODE
          ? new MessageWriter()
          : new FileSystemWriter({
              resultsDir,
            }),
      });
      this.testPath = context.testPath.replace(config.globalConfig.rootDir, "").replace(sep, "");

      // @ts-ignore
      const testRuntime = new AllureJestTestRuntime(this as AllureJestEnvironment, this.global);

      // @ts-ignore
      this.global.allure = allure;

      setGlobalTestRuntime(testRuntime);
    }

    setup() {
      return super.setup();
    }

    teardown() {
      return super.teardown();
    }

    handleAllureRuntimeMessage(payload: { currentTestName?: string; currentSuiteId: string; message: RuntimeMessage }) {
      const executableUuid = last(this.runContext.executables);

      this.runtime.applyRuntimeMessages(executableUuid, [payload.message]);
    }

    handleTestEvent = (event: Circus.Event, state: Circus.State) => {
      switch (event.name) {
        case "run_start":
          this.jestState = state;
          break;
        case "hook_start":
          this.handleHookStart(event.hook);
          break;
        case "hook_success":
          this.handleHookPass(event.hook);
          break;
        case "hook_failure":
          this.handleHookFail(event.hook, event.error);
          break;
        case "run_describe_start":
          this.handleSuiteStart();
          break;
        case "run_describe_finish":
          this.handleSuiteEnd();
          break;
        case "test_start":
          this.handleTestStart(event.test);
          break;
        case "test_todo":
          this.handleTestTodo();
          break;
        case "test_fn_success":
          this.handleTestPass();
          break;
        case "test_fn_failure":
          this.handleTestFail(event.test);
          break;
        case "test_skip":
          this.handleTestSkip();
          break;
        case "run_finish":
          this.handleRunFinish();
          break;
        default:
          break;
      }
    };

    private handleSuiteStart() {
      const scopeUuid = this.runtime.startScope();

      this.runContext.scopes.push(scopeUuid);
    }

    private handleSuiteEnd() {
      const scopeUuid = this.runContext.scopes.pop()!;

      this.runtime.writeScope(scopeUuid);
    }

    private handleHookStart(hook: Circus.Hook) {
      if (shouldHookBeSkipped(hook)) {
        return;
      }

      const scopeUuid = last(this.runContext.scopes);
      const fixtureUuid = this.runtime.startFixture(scopeUuid, /after/i.test(hook.type) ? "after" : "before", {
        name: hook.type,
      })!;

      this.runContext.executables.push(fixtureUuid);
    }

    private handleHookPass(hook: Circus.Hook) {
      if (shouldHookBeSkipped(hook)) {
        return;
      }

      const fixtureUuid = this.runContext.executables.pop()!;

      this.runtime.updateFixture(fixtureUuid, (r) => {
        r.status = Status.PASSED;
        r.stage = Stage.FINISHED;
      });
      this.runtime.stopFixture(fixtureUuid);
    }

    private handleHookFail(hook: Circus.Hook, error: string | Circus.Exception) {
      if (shouldHookBeSkipped(hook)) {
        return;
      }

      const fixtureUuid = this.runContext.executables.pop()!;
      const status = typeof error === "string" ? Status.BROKEN : getStatusFromError(error as Error);

      this.runtime.updateFixture(fixtureUuid, (r) => {
        r.status = status;
        r.statusDetails = {
          message: typeof error === "string" ? error : error.message,
          trace: typeof error === "string" ? undefined : error.stack,
        };
        r.stage = Stage.FINISHED;
      });
      this.runtime.stopFixture(fixtureUuid);
    }

    private startTest(test: Circus.TestEntry) {
      const scopeUuid = last(this.runContext.scopes);
      const newTestSuitePath = getTestPath(test.parent);
      const newTestPath = newTestSuitePath.concat(test.name);
      const newTestId = getTestId(newTestPath);
      const threadLabel = ALLURE_THREAD_NAME || JEST_WORKER_ID || process.pid.toString();
      const hostLabel = ALLURE_HOST_NAME || hostname;
      const packageLabel = dirname(this.testPath).split(sep).join(".");
      const testUuid = this.runtime.startTest(
        {
          name: test.name,
          fullName: newTestId,
          labels: [
            {
              name: LabelName.LANGUAGE,
              value: "javascript",
            },
            {
              name: LabelName.FRAMEWORK,
              value: "jest",
            },
            {
              name: LabelName.PACKAGE,
              value: packageLabel,
            },
          ],
        },
        [scopeUuid],
      );

      this.runtime.updateTest(testUuid, (result) => {
        if (threadLabel) {
          result.labels.push({ name: LabelName.THREAD, value: threadLabel });
        }

        if (hostLabel) {
          result.labels.push({ name: LabelName.HOST, value: hostLabel });
        }

        result.labels.push(...getSuiteLabels(newTestSuitePath));
      });

      this.runContext.executables.push(testUuid);

      return testUuid;
    }

    private stopTest(testUuid: string) {
      if (!testUuid) {
        return;
      }

      this.runtime.stopTest(testUuid);
      this.runtime.writeTest(testUuid);
    }

    private handleTestStart(test: Circus.TestEntry) {
      const testUuid = this.startTest(test);

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.RUNNING;
      });
    }

    private handleTestPass() {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.PASSED;
      });
      this.stopTest(testUuid);
    }

    private handleTestFail(test: Circus.TestEntry) {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      // jest collects all errors, but we need to report the first one because it's a reason why the test has been failed
      const [error] = test.errors;
      const hasMultipleErrors = Array.isArray(error);
      const firstError: Error = hasMultipleErrors ? error[0] : error;
      const details = getMessageAndTraceFromError(firstError);
      const status = getStatusFromError(firstError);

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = status;
        result.statusDetails = {
          ...details,
        };
      });
      this.stopTest(testUuid);
    }

    private handleTestSkip() {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      });
      this.stopTest(testUuid);
    }

    private handleTestTodo() {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      });
      this.stopTest(testUuid);
    }

    private handleRunFinish() {
      this.runtime.writeEnvironmentInfo();
      this.runtime.writeCategoriesDefinitions();
    }
  };
};

export default createJestEnvironment;
