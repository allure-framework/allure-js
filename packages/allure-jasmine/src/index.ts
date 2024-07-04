import { cwd, env } from "node:process";
import * as allure from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { isPromise } from "allure-js-commons/sdk";
import type { Config, FixtureType } from "allure-js-commons/sdk/reporter";
import { FileSystemWriter, MessageWriter, ReporterRuntime, getSuiteLabels, getEnvironmentLabels } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { JasmineBeforeAfterFn } from "./model.js";
import { findAnyError, findMessageAboutThrow } from "./utils.js";

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
  private jasmineSuitesStack: jasmine.SuiteResult[] = [];
  private scopesStack: string[] = [];

  constructor(config: Config) {
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

    this.installHooks();

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

  private getSpecFullName(spec: jasmine.SpecResult & { filename?: string }) {
    const specFilename = (spec.filename || "").replace(cwd(), "").replace(/^[/\\]/, "");
    const specPath = this.getCurrentSpecPath().concat(spec.description).join(" > ");

    return `${specFilename}#${specPath}`;
  }

  getAllureInterface() {
    return allure;
  }

  handleAllureRuntimeMessages(message: RuntimeMessage) {
    if (!this.currentAllureTestUuid) {
      return;
    }
    this.allureRuntime.applyRuntimeMessages(this.currentAllureTestUuid, [message]);
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
    const scopeUuid = this.allureRuntime.startScope();
    this.scopesStack.push(scopeUuid);
  }

  suiteDone(): void {
    this.jasmineSuitesStack.pop();
    const scopeUuid = this.scopesStack.pop();
    if (scopeUuid) {
      this.allureRuntime.writeScope(scopeUuid);
    }
  }

  specStarted(spec: jasmine.SpecResult): void {
    this.currentAllureTestUuid = this.allureRuntime.startTest(
      {
        name: spec.description,
        fullName: this.getSpecFullName(spec),
        stage: Stage.RUNNING,
      },
      this.scopesStack,
    );
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

  private installHooks(): void {
    const jasmineBeforeAll: JasmineBeforeAfterFn = global.beforeAll;
    const jasmineAfterAll: JasmineBeforeAfterFn = global.afterAll;
    const jasmineBeforeEach: JasmineBeforeAfterFn = global.beforeEach;
    const jasmineAfterEach: JasmineBeforeAfterFn = global.afterEach;
    const wrapJasmineHook = (original: JasmineBeforeAfterFn, fixtureType: FixtureType, fixtureName: string) => {
      return (action: (done: DoneFn) => void, timeout?: number): void => {
        original((done) => {
          const start = Date.now();
          let ret;

          if (action.length > 0) {
            // function takes done callback
            ret = new Promise((resolve, reject) => {
              const t: any = resolve;

              t.fail = reject;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              action(t);
            });
          } else {
            ret = action(done);
          }

          if (isPromise(ret)) {
            (ret as Promise<any>)
              .then(() => {
                done();

                const scopeUuid =
                  this.scopesStack.length > 0 ? this.scopesStack[this.scopesStack.length - 1] : undefined;
                if (scopeUuid) {
                  const fixtureUuid = this.allureRuntime.startFixture(scopeUuid, fixtureType, {
                    name: fixtureName,
                    stage: Stage.FINISHED,
                    status: Status.PASSED,
                    start,
                  });
                  if (fixtureUuid) {
                    this.allureRuntime.stopFixture(fixtureUuid);
                  }
                }
              })
              .catch((err) => {
                done.fail(err as Error);
                const scopeUuid =
                  this.scopesStack.length > 0 ? this.scopesStack[this.scopesStack.length - 1] : undefined;
                if (scopeUuid) {
                  const fixtureUuid = this.allureRuntime.startFixture(scopeUuid, fixtureType, {
                    name: fixtureName,
                    stage: Stage.FINISHED,
                    status: Status.BROKEN,
                    start,
                  });
                  if (fixtureUuid) {
                    this.allureRuntime.stopFixture(fixtureUuid);
                  }
                }
              });
          } else {
            try {
              done();
              const scopeUuid = this.scopesStack.length > 0 ? this.scopesStack[this.scopesStack.length - 1] : undefined;
              if (scopeUuid) {
                const fixtureUuid = this.allureRuntime.startFixture(scopeUuid, fixtureType, {
                  name: fixtureName,
                  stage: Stage.FINISHED,
                  status: Status.PASSED,
                  start,
                });
                if (fixtureUuid) {
                  this.allureRuntime.stopFixture(fixtureUuid);
                }
              }
            } catch (err) {
              const { message, stack } = err as Error;
              const scopeUuid = this.scopesStack.length > 0 ? this.scopesStack[this.scopesStack.length - 1] : undefined;
              if (scopeUuid) {
                const fixtureUuid = this.allureRuntime.startFixture(scopeUuid, fixtureType, {
                  name: fixtureName,
                  stage: Stage.FINISHED,
                  status: Status.BROKEN,
                  statusDetails: {
                    message,
                    trace: stack,
                  },
                  start,
                });
                if (fixtureUuid) {
                  this.allureRuntime.stopFixture(fixtureUuid);
                }
              }

              throw err;
            }
          }
        }, timeout);
      };
    };

    global.beforeAll = wrapJasmineHook(jasmineBeforeAll, "before", "beforeAll");
    global.beforeEach = wrapJasmineHook(jasmineBeforeEach, "before", "beforeEach");
    global.afterAll = wrapJasmineHook(jasmineAfterAll, "after", "afterAll");
    global.afterEach = wrapJasmineHook(jasmineAfterEach, "after", "afterEach");
  }
}
