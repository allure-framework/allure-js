import type { EnvironmentContext, JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import { relative } from "node:path";
import { env } from "node:process";
import * as allure from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getPosixPath,
  getSuiteLabels,
  getThreadLabel,
  parseTestPlan,
} from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureJestTestRuntime } from "./AllureJestTestRuntime.js";
import type { AllureJestConfig, AllureJestEnvironment, AllureJestProjectConfig, RunContext } from "./model.js";
import { getTestId, getTestPath, isTestPresentInTestPlan, last, shouldHookBeSkipped } from "./utils.js";

const createJestEnvironment = <T extends typeof JestEnvironment>(Base: T): T => {
  // @ts-expect-error (ts(2545)) Incorrect assumption about a mixin class: https://github.com/microsoft/TypeScript/issues/37142
  return class extends Base {
    testPath: string;
    testPlan?: TestPlanV1;
    runtime: ReporterRuntime;
    runContext: RunContext = {
      executables: [],
      steps: [],
      scopes: [],
      skippedTestsFullNamesByTestPlan: [],
    };

    // config is AllureJestConfig in Jest v28 or greater. In older versions
    // it's AllureJestProjectConfig. See https://github.com/jestjs/jest/pull/12461
    constructor(config: AllureJestConfig | AllureJestProjectConfig, context: EnvironmentContext) {
      super(config as JestEnvironmentConfig, context);

      const projectConfig = "projectConfig" in config ? config.projectConfig : config;
      const { resultsDir, ...restConfig } = projectConfig?.testEnvironmentOptions || {};

      this.runtime = new ReporterRuntime({
        ...restConfig,
        writer: createDefaultWriter({ resultsDir }),
      });
      this.testPath = relative(projectConfig.rootDir, context.testPath);
      this.testPlan = parseTestPlan();

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

    handleAllureRuntimeMessage(message: RuntimeMessage) {
      const executableUuid = last(this.runContext.executables);

      this.runtime.applyRuntimeMessages(executableUuid, [message]);
    }

    handleTestEvent = (event: Circus.Event) => {
      switch (event.name) {
        case "hook_start":
          this.#handleHookStart(event.hook);
          break;
        case "hook_success":
          this.#handleHookPass(event.hook);
          break;
        case "hook_failure":
          this.#handleHookFail(event.hook, event.error);
          break;
        case "run_describe_start":
          this.#handleSuiteStart();
          break;
        case "run_describe_finish":
          this.#handleSuiteEnd();
          break;
        case "test_start":
          this.#handleTestStart(event.test);
          break;
        case "test_done":
          this.#handleTestDone();
          break;
        case "test_todo":
          this.#handleTestTodo(event.test);
          break;
        case "test_fn_success":
          this.#handleTestPass(event.test);
          break;
        case "test_fn_failure":
          this.#handleTestFail(event.test);
          break;
        case "test_skip":
          this.#handleTestSkip(event.test);
          break;
        case "run_finish":
          this.#handleRunFinish();
          break;
        default:
          break;
      }
    };

    #getTestFullName(test: Circus.TestEntry) {
      const newTestSuitePath = getTestPath(test.parent);
      const newTestPath = newTestSuitePath.concat(test.name);
      const newTestId = getTestId(newTestPath);

      return `${getPosixPath(this.testPath)}#${newTestId}`;
    }

    #handleSuiteStart() {
      this.#startScope();
    }

    #handleSuiteEnd() {
      this.#stopScope();
    }

    #handleHookStart(hook: Circus.Hook) {
      if (shouldHookBeSkipped(hook)) {
        return;
      }

      const scopeUuid = last(this.runContext.scopes);
      const fixtureUuid = this.runtime.startFixture(scopeUuid, /after/i.test(hook.type) ? "after" : "before", {
        name: hook.type,
      })!;

      this.runContext.executables.push(fixtureUuid);
    }

    #handleHookPass(hook: Circus.Hook) {
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

    #handleHookFail(hook: Circus.Hook, error: string | Circus.Exception) {
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

    #startTest(test: Circus.TestEntry) {
      const newTestSuitePath = getTestPath(test.parent);
      const newTestFullName = this.#getTestFullName(test);

      if (this.testPlan && !isTestPresentInTestPlan(newTestFullName, this.testPlan)) {
        test.mode = "skip";
        this.runContext.skippedTestsFullNamesByTestPlan.push(newTestFullName);
        return;
      }

      this.#startScope();
      const testUuid = this.runtime.startTest(
        {
          name: test.name,
          fullName: newTestFullName,
          start: test.startedAt ?? undefined,
          labels: [
            getLanguageLabel(),
            getFrameworkLabel("jest"),
            getPackageLabel(this.testPath),
            getHostLabel(),
            getThreadLabel(env.JEST_WORKER_ID),
            ...getEnvironmentLabels(),
            ...getSuiteLabels(newTestSuitePath),
          ],
        },
        this.runContext.scopes,
      );

      this.runContext.executables.push(testUuid);

      return testUuid;
    }

    #stopTest(testUuid: string, duration: number) {
      if (!testUuid) {
        return;
      }

      this.runtime.stopTest(testUuid, { duration });
      this.runtime.writeTest(testUuid);
    }

    #handleTestStart(test: Circus.TestEntry) {
      const testUuid = this.#startTest(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.RUNNING;
      });
    }

    #handleTestDone() {
      this.#stopScope();
    }

    #startScope() {
      const scopeUuid = this.runtime.startScope();

      this.runContext.scopes.push(scopeUuid);
    }

    #stopScope() {
      const scopeUuid = this.runContext.scopes.pop()!;

      this.runtime.writeScope(scopeUuid);
    }

    #handleTestPass(test: Circus.TestEntry) {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.PASSED;
      });
      this.#stopTest(testUuid, test.duration ?? 0);
    }

    #handleTestFail(test: Circus.TestEntry) {
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
      this.#stopTest(testUuid, test.duration ?? 0);
    }

    #handleTestSkip(test: Circus.TestEntry) {
      const newTestFullName = this.#getTestFullName(test);

      if (this.runContext.skippedTestsFullNamesByTestPlan.includes(newTestFullName)) {
        return;
      }

      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      });
      this.#stopTest(testUuid, test.duration ?? 0);
    }

    #handleTestTodo(test: Circus.TestEntry) {
      const testUuid = this.runContext.executables.pop();

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      });
      this.#stopTest(testUuid, test.duration ?? 0);
    }

    #handleRunFinish() {
      this.runtime.writeEnvironmentInfo();
      this.runtime.writeCategoriesDefinitions();
    }
  };
};

export default createJestEnvironment;
