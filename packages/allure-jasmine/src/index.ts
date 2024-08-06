import { env } from "node:process";
import * as allure from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError, isPromise } from "allure-js-commons/sdk";
import type { FixtureType, ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  FileSystemWriter,
  MessageWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getSuiteLabels,
  hasSkipLabel,
} from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { JasmineBeforeAfterFn } from "./model.js";
import { enableAllureJasmineTestPlan } from "./testplan.js";
import { findAnyError, findMessageAboutThrow, getAllureNamesAndLabels, last } from "./utils.js";

class AllureJasmineTestRuntime extends MessageTestRuntime {
  constructor(private readonly allureJasmineReporter: AllureJasmineReporter) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.allureJasmineReporter.handleAllureRuntimeMessages(message);
    await Promise.resolve();
  }
}

const { ALLURE_TEST_MODE } = env;

export default class AllureJasmineReporter implements jasmine.CustomReporter {
  private readonly allureRuntime: ReporterRuntime;
  private currentAllureTestUuid?: string;
  private currentAllureFixtureUuid?: string;
  private jasmineSuitesStack: jasmine.SuiteResult[] = [];
  private scopesStack: string[] = [];

  constructor(config: ReporterConfig) {
    const { resultsDir = "./allure-results", ...restConfig } = config || {};

    this.allureRuntime = new ReporterRuntime({
      ...restConfig,
      writer: ALLURE_TEST_MODE
        ? new MessageWriter()
        : new FileSystemWriter({
            resultsDir,
          }),
    });

    const testRuntime = new AllureJasmineTestRuntime(this);

    setGlobalTestRuntime(testRuntime);

    this.#enableAllureFeatures();

    // the best place to start global container for hooks and nested suites
    const scopeUuid = this.allureRuntime.startScope();
    this.scopesStack.push(scopeUuid);
  }

  private getCurrentSpecPath() {
    const path = this.jasmineSuitesStack.map((suite) => suite?.fullName).filter(Boolean);

    return path.filter(Boolean).reduce(
      ([acc, lastPath], currentPath) => {
        const newSpecPath = acc.concat(currentPath.replace(lastPath as string, "").trim());

        return [newSpecPath, currentPath];
      },
      [[] as string[], ""],
    )[0] as string[];
  }

  getAllureInterface() {
    return allure;
  }

  handleAllureRuntimeMessages(message: RuntimeMessage) {
    const rootUuid = this.currentAllureFixtureUuid ?? this.currentAllureTestUuid;
    if (!rootUuid) {
      return;
    }
    this.allureRuntime.applyRuntimeMessages(rootUuid, [message]);
  }

  jasmineStarted(): void {
    const allureRuntime = this.allureRuntime;
    const globalJasmine = globalThis.jasmine;
    const currentAllureStepResultGetter = () =>
      this.currentAllureTestUuid ? this.allureRuntime.currentStep(this.currentAllureTestUuid) : undefined;
    // @ts-ignore
    const originalExpectationHandler = globalJasmine.Spec.prototype.addExpectationResult;

    // soft-asserts support (when failed assertions don't throw errors)
    // @ts-ignore
    globalJasmine.Spec.prototype.addExpectationResult = function (passed, data, isError) {
      const isStepFailed = !passed && !isError;

      const stepUuid = currentAllureStepResultGetter();
      if (stepUuid && isStepFailed) {
        allureRuntime.updateStep(stepUuid, (result) => {
          result.status = Status.FAILED;
          result.stage = Stage.FINISHED;
        });
      }

      originalExpectationHandler.call(this, passed, data, isError);
    };
  }

  suiteStarted(suite: jasmine.SuiteResult): void {
    this.jasmineSuitesStack.push(suite);
    this.#startScope();
  }

  suiteDone(): void {
    this.jasmineSuitesStack.pop();
    this.#stopScope();
  }

  specStarted(spec: jasmine.SpecResult & { filename?: string }): void {
    const { fullName, labels, name } = getAllureNamesAndLabels(
      spec.filename,
      this.getCurrentSpecPath(),
      spec.description,
    );
    if (!hasSkipLabel(labels)) {
      this.#startScope();
      this.currentAllureTestUuid = this.allureRuntime.startTest(
        {
          name,
          fullName,
          labels,
          stage: Stage.RUNNING,
        },
        this.scopesStack,
      );
    }
  }

  specDone(spec: jasmine.SpecResult): void {
    if (!this.currentAllureTestUuid) {
      return;
    }
    const specPath = this.getCurrentSpecPath();
    const exceptionInfo = findMessageAboutThrow(spec.failedExpectations) || findAnyError(spec.failedExpectations);

    this.allureRuntime.updateTest(this.currentAllureTestUuid, (result) => {
      const suitesLabels = getSuiteLabels(specPath);

      result.labels.push(...suitesLabels);
      result.labels.push(...getEnvironmentLabels());

      if (spec.status === "pending" || spec.status === "disabled" || spec.status === "excluded") {
        result.status = Status.SKIPPED;
        result.stage = Stage.PENDING;
        result.statusDetails = {
          message: spec.pendingReason || "Suite disabled",
        };
        return;
      }

      result.stage = Stage.FINISHED;

      if (spec.status === "passed") {
        result.status = Status.PASSED;
        return;
      }

      if (exceptionInfo) {
        result.statusDetails = {
          message: exceptionInfo.message,
          trace: exceptionInfo.stack,
        };
      }

      if (spec.status === "failed" && exceptionInfo?.matcherName) {
        result.status = Status.FAILED;
        return;
      } else {
        result.status = Status.BROKEN;
        return;
      }
    });
    this.allureRuntime.stopTest(this.currentAllureTestUuid);
    this.allureRuntime.writeTest(this.currentAllureTestUuid);
    this.currentAllureTestUuid = undefined;

    this.#stopScope();
  }

  jasmineDone(): void {
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
    // write global container (or any remaining scopes)
    this.scopesStack.forEach((scopeUuid) => {
      this.allureRuntime.writeScope(scopeUuid);
    });
    this.scopesStack = [];
  }

  #startScope = () => {
    const scopeUuid = this.allureRuntime.startScope();
    this.scopesStack.push(scopeUuid);
  };

  #startFixture = (name: string, type: FixtureType) => {
    const scopeUuid = last(this.scopesStack);
    if (scopeUuid) {
      this.currentAllureFixtureUuid = this.allureRuntime.startFixture(scopeUuid, type, {
        name,
        stage: Stage.RUNNING,
      });
      return this.currentAllureFixtureUuid;
    }
  };

  #stopFixture = (uuid: string, error?: Error | string) => {
    const statusAndDetails = this.#resolveStatusWithDetails(error);
    this.allureRuntime.updateFixture(uuid, (f) => Object.assign(f, statusAndDetails));
    this.allureRuntime.stopFixture(uuid);
    this.currentAllureFixtureUuid = undefined;
  };

  #stopScope = () => {
    const scopeUuid = this.scopesStack.pop();
    if (scopeUuid) {
      this.allureRuntime.writeScope(scopeUuid);
    }
  };

  #enableAllureFeatures = () => {
    this.#enableAllureFixtures();
    enableAllureJasmineTestPlan();
  };

  #enableAllureFixtures(): void {
    const jasmineBeforeAll: JasmineBeforeAfterFn = global.beforeAll;
    const jasmineAfterAll: JasmineBeforeAfterFn = global.afterAll;
    const jasmineBeforeEach: JasmineBeforeAfterFn = global.beforeEach;
    const jasmineAfterEach: JasmineBeforeAfterFn = global.afterEach;

    global.beforeAll = this.#injectFixtureSupportToHookFn(jasmineBeforeAll, "before", "beforeAll");
    global.beforeEach = this.#injectFixtureSupportToHookFn(jasmineBeforeEach, "before", "beforeEach");
    global.afterAll = this.#injectFixtureSupportToHookFn(jasmineAfterAll, "after", "afterAll");
    global.afterEach = this.#injectFixtureSupportToHookFn(jasmineAfterEach, "after", "afterEach");
  }

  #injectFixtureSupportToHookFn =
    (jasmineHookFn: JasmineBeforeAfterFn, fixtureType: FixtureType, fixtureName: string) =>
    (hookImpl: jasmine.ImplementationCallback, timeout?: number): void =>
      jasmineHookFn(
        // We use different wrappers here to keep the original length
        hookImpl.length === 0
          ? this.#wrapSyncOrPromiseBasedHookInAllureFixture(
              fixtureType,
              fixtureName,
              hookImpl as () => void | PromiseLike<any>,
            )
          : this.#wrapCallbackBasedHookInAllureFixture(fixtureType, fixtureName, hookImpl),
        timeout,
      );

  #wrapSyncOrPromiseBasedHookInAllureFixture = (
    fixtureType: FixtureType,
    fixtureName: string,
    hookImpl: () => void | PromiseLike<any>,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const reporter = this;
    return function (this: unknown) {
      // Bind hook impl to propagate UserContext
      const ctxBoundHookImpl = hookImpl.bind(this);

      const fixtureUuid = reporter.#startFixture(fixtureName, fixtureType);
      if (!fixtureUuid) {
        // No scope started; probably an issue in our code. Just call the hook directly
        return ctxBoundHookImpl();
      } else {
        const maybePromise = reporter.#callHookAndStopFixtureOnSyncError(fixtureUuid, ctxBoundHookImpl);

        if (isPromise(maybePromise)) {
          return reporter.#stopFixtureWhenPromiseIsDone(fixtureUuid, maybePromise);
        }

        reporter.#stopFixture(fixtureUuid);

        // A sync hook shouldn't return a value. But in case it does, we preserve it and let Jasmine handle it.
        return maybePromise;
      }
    };
  };

  #wrapCallbackBasedHookInAllureFixture = (
    fixtureType: FixtureType,
    fixtureName: string,
    hookImpl: (done: DoneFn) => void,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const reporter = this;
    return function (this: unknown, done: DoneFn) {
      // Bind hook impl to propagate UserContext
      const ctxBoundHookImpl = hookImpl.bind(this);

      const fixtureUuid = reporter.#startFixture(fixtureName, fixtureType);
      if (!fixtureUuid) {
        // No scope started; probably an issue in our code. Just call the hook directly
        return ctxBoundHookImpl(done);
      } else {
        const stopFixtureAndContinue = reporter.#injectStopFixtureToHookCallback(fixtureUuid, done);

        // A callback-based hook shouldn't return a value. But in case it does, we preserve it and let Jasmine handle it.
        return reporter.#callHookAndStopFixtureOnSyncError(fixtureUuid, ctxBoundHookImpl, stopFixtureAndContinue);
      }
    };
  };

  #callHookAndStopFixtureOnSyncError = <TArgs extends readonly any[], TResult>(
    fixtureUuid: string,
    fn: (...args: TArgs) => TResult,
    ...args: TArgs
  ) => {
    try {
      return fn(...args);
    } catch (error) {
      this.#stopFixture(fixtureUuid, error as Error | string);
      throw error;
    }
  };

  #stopFixtureWhenPromiseIsDone = (fixtureUuid: string, hookPromise: PromiseLike<unknown>) =>
    hookPromise.then(
      (value) => {
        this.#stopFixture(fixtureUuid);
        return value;
      },
      (error) => {
        this.#stopFixture(fixtureUuid, error as Error | string);
        throw error;
      },
    );

  #injectStopFixtureToHookCallback = (fixtureUuid: string, done: DoneFn): DoneFn => {
    const stopFixtureAndContinue = (error?: Error | string) => {
      this.#stopFixture(fixtureUuid, error);
      // @ts-ignore
      done(error);
    };
    stopFixtureAndContinue.fail = (error?: Error | string) => {
      this.#stopFixture(fixtureUuid, error ?? "done.fail was called");
      done.fail(error);
    };
    return stopFixtureAndContinue;
  };

  #resolveStatusWithDetails = (error: Error | string | undefined) => {
    if (typeof error === "undefined") {
      return { status: Status.PASSED };
    } else if (typeof error === "string") {
      return { status: Status.BROKEN, statusDetails: { message: error } };
    } else {
      return { status: getStatusFromError(error), statusDetails: getMessageAndTraceFromError(error) };
    }
  };
}
