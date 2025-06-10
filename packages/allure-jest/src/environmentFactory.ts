import type { EnvironmentContext, JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import { relative, sep } from "node:path";
import { env } from "node:process";
import * as allure from "allure-js-commons";
import { Stage, Status, type StatusDetails, type TestResult } from "allure-js-commons";
import { type RuntimeMessage, type TestPlanV1, serialize } from "allure-js-commons/sdk";
import { extractMetadataFromString, getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
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
          this.#handleTestScopeStart();
          break;
        case "test_fn_start":
          this.#handleTestStart(event.test);
          break;
        case "test_fn_success":
          this.#handleTestPass(event.test);
          break;
        case "test_fn_failure":
          this.#handleTestFail(event.test);
          break;
        case "test_done":
          this.#handleTestScopeStop(event.test);
          break;
        case "test_skip":
          this.#handleTestSkip(event.test);
          break;
        case "test_todo":
          this.#handleTestTodo(event.test);
          break;
        case "run_finish":
          this.#handleRunFinish();
          break;
        default:
          break;
      }
    };

    #getTestFullName(test: Circus.TestEntry, testTitle: string = test.name) {
      const newTestSuitePath = getTestPath(test.parent);
      const newTestPath = newTestSuitePath.concat(testTitle);
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

    #handleTestStart(test: Circus.TestEntry) {
      const fsPath = this.testPath.split(sep);
      const newTestSuitePath = getTestPath(test.parent);
      const titlePath = fsPath.concat(newTestSuitePath);
      const { cleanTitle, labels, links } = extractMetadataFromString(test.name);
      const newTestFullName = this.#getTestFullName(test, cleanTitle);

      if (this.testPlan && !isTestPresentInTestPlan(newTestFullName, this.testPlan)) {
        test.mode = "skip";
        this.runContext.skippedTestsFullNamesByTestPlan.push(newTestFullName);
        return;
      }

      const testUuid = this.runtime.startTest(
        {
          name: cleanTitle,
          fullName: newTestFullName,
          start: test.startedAt ?? undefined,
          stage: Stage.RUNNING,
          labels: [
            getLanguageLabel(),
            getFrameworkLabel("jest"),
            getPackageLabel(this.testPath),
            getHostLabel(),
            getThreadLabel(env.JEST_WORKER_ID),
            ...getEnvironmentLabels(),
            ...getSuiteLabels(newTestSuitePath),
            ...labels,
          ],
          titlePath,
          links,
        },
        this.runContext.scopes,
      );

      this.runContext.executables.push(testUuid);

      return testUuid;
    }

    #handleTestScopeStart() {
      this.#startScope();
    }

    #handleTestScopeStop(test: Circus.TestEntry) {
      const testUuid = this.runContext.executables.pop();

      if (testUuid) {
        const { details } = this.#statusAndDetails(test.errors);
        let tr: TestResult | undefined;
        this.runtime.updateTest(testUuid, (result) => {
          tr = result;
        });
        // hook failure, finish as skipped
        if (tr?.status === undefined && tr?.stage === Stage.RUNNING) {
          this.runtime.updateTest(testUuid, (result) => {
            result.stage = Stage.FINISHED;
            result.status = Status.SKIPPED;
            result.statusDetails = {
              ...result.statusDetails,
              ...details,
            };
          });
        }

        this.runtime.writeTest(testUuid);
      }

      this.#stopScope();
    }

    #startScope() {
      const scopeUuid = this.runtime.startScope();

      this.runContext.scopes.push(scopeUuid);
    }

    #stopScope() {
      const scopeUuid = this.runContext.scopes.pop();
      if (!scopeUuid) {
        return;
      }

      this.runtime.writeScope(scopeUuid);
    }

    #handleTestPass(test: Circus.TestEntry) {
      const testUuid = this.#currentExecutable();

      if (!testUuid) {
        return;
      }
      // @ts-ignore
      const { suppressedErrors = [] } = this.global.expect.getState();
      const statusAndDetails = this.#statusAndDetails(suppressedErrors as Circus.TestError[]);

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = statusAndDetails.status;
        result.statusDetails = {
          ...result.statusDetails,
          ...statusAndDetails.details,
        };
      });

      this.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
    }

    #handleTestFail(test: Circus.TestEntry) {
      const testUuid = this.#currentExecutable();

      if (!testUuid) {
        return;
      }

      const { status, details } = this.#statusAndDetails(test.errors);

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = status;
        result.statusDetails = {
          ...result.statusDetails,
          ...details,
        };
      });
      this.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
    }

    #handleTestSkip(test: Circus.TestEntry) {
      const newTestFullName = this.#getTestFullName(test);

      if (this.runContext.skippedTestsFullNamesByTestPlan.includes(newTestFullName)) {
        return;
      }

      // noinspection JSPotentiallyInvalidUsageOfThis
      const testUuid = this.#handleTestStart(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.SKIPPED;
      });
      // noinspection JSPotentiallyInvalidUsageOfThis
      this.#handleTestScopeStop(test);
    }

    #handleTestTodo(test: Circus.TestEntry) {
      // noinspection JSPotentiallyInvalidUsageOfThis
      const testUuid = this.#handleTestStart(test);
      if (!testUuid) {
        return;
      }

      this.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.SKIPPED;
        result.statusDetails = {
          message: "TODO",
        };
      });
      // noinspection JSPotentiallyInvalidUsageOfThis
      this.#handleTestScopeStop(test);
    }

    #handleRunFinish() {
      this.runtime.writeEnvironmentInfo();
      this.runtime.writeCategoriesDefinitions();
    }

    #currentExecutable() {
      if (this.runContext.executables.length === 0) {
        return undefined;
      }
      return this.runContext.executables[this.runContext.executables.length - 1];
    }

    #statusAndDetails(errors: Circus.TestError[]): { status: Status; details: Partial<StatusDetails> } {
      if (errors.length === 0) {
        return {
          status: Status.PASSED,
          details: {},
        };
      }
      // jest collects all errors, but we need to report the first one because it's a reason why the test has been failed
      const [error] = errors;
      const hasMultipleErrors = Array.isArray(error);
      const exception: Circus.Exception = hasMultipleErrors ? error[0] : error;

      const firstError = this.#convertToError(exception);

      // in case user throws non-Error type, the first exception is the user-thrown object,
      // while the second one is provided by jest and has correct stack trace
      if (hasMultipleErrors && error.length > 1) {
        const secondError = this.#convertToError(error[1]);
        if (!firstError.message) {
          firstError.message = secondError.message;
        }
        if (!firstError.stack) {
          firstError.stack = secondError.stack;
        }
      }

      const details = getMessageAndTraceFromError(firstError);
      const status = getStatusFromError(firstError);
      return { status, details };
    }

    #convertToError(exception: Circus.Exception):
      | Error
      | {
          message?: string;
          stack?: string;
        } {
      if (!exception) {
        return {};
      }
      // user may throw an object as well
      if (typeof exception !== "object" || !("stack" in exception)) {
        return {
          message: serialize(exception),
        };
      }

      const prototypeDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(exception));
      const protoClone = Object.create(null, prototypeDescriptors);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const clone = Object.create(protoClone, Object.getOwnPropertyDescriptors(exception));

      return clone as
        | Error
        | {
            message?: string;
            stack?: string;
          };
    }
  };
};

export { createJestEnvironment };
