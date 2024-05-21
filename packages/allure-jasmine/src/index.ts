import { cwd } from "node:process";
import * as allure from "allure-js-commons";
import {
  AllureNodeReporterRuntime,
  ContentType,
  FileSystemAllureWriter,
  FixtureType,
  Label,
  LabelName,
  Link,
  LinkType,
  MessageAllureWriter,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
  getStatusFromError,
  getSuiteLabels,
  isPromise,
  setGlobalTestRuntime,
} from "allure-js-commons/sdk/node";
import { AllureJasmineConfig, JasmineBeforeAfterFn } from "./model.js";
import { findAnyError, findMessageAboutThrow } from "./utils.js";

class AllureJasmineTestRuntime implements TestRuntime {
  constructor(private allureJasmineReporter: AllureJasmineReporter) {}

  async label(name: LabelName | string, value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  async labels(...labels: Label[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  async link(url: string, type?: LinkType | string, name?: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  async links(...links: Link[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  async parameter(name: string, value: string, options?: ParameterOptions) {
    await this.sendMessage({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  async description(markdown: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  async descriptionHtml(html: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  async displayName(name: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  async historyId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  async testCaseId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  async attachment(name: string, content: Buffer | string, type: string | ContentType) {
    await this.sendMessage({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      },
    });
  }

  async step(name: string, body: () => void | PromiseLike<void>) {
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      await body();

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    } catch (err) {
      await this.sendMessage({
        type: "step_stop",
        data: {
          // @ts-ignore
          status: getStatusFromError(err),
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            // @ts-ignore
            message: err.message,
            // @ts-ignore
            trace: err.stack,
          },
        },
      });

      throw err;
    }
  }

  async stepDisplayName(name: string) {
    await this.sendMessage({
      type: "step_metadata",
      data: { name },
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    await this.sendMessage({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  async sendMessage(message: RuntimeMessage) {
    this.allureJasmineReporter.handleAllureRuntimeMessages(message);

    await Promise.resolve();
  }
}

export default class AllureJasmineReporter implements jasmine.CustomReporter {
  private readonly allureRuntime: AllureNodeReporterRuntime;
  private currentAllureTestUuid?: string;
  private jasmineSuitesStack: jasmine.SuiteResult[] = [];

  constructor(config: AllureJasmineConfig) {
    const { testMode, resultsDir = "./allure-results", ...restConfig } = config || {};

    this.allureRuntime = new AllureNodeReporterRuntime({
      ...restConfig,
      writer: testMode
        ? new MessageAllureWriter()
        : new FileSystemAllureWriter({
            resultsDir,
          }),
    });

    const testRuntime = new AllureJasmineTestRuntime(this);

    setGlobalTestRuntime(testRuntime);

    this.installHooks();

    // the best place to start global container for hooks and nested suites
    this.allureRuntime.startScope();
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
    this.allureRuntime.applyRuntimeMessages([message], { testUuid: this.currentAllureTestUuid! });
  }

  jasmineStarted(): void {
    const allureRuntime = this.allureRuntime;
    const globalJasmine = globalThis.jasmine;
    const currentAllureResultUuidGetter = () => this.currentAllureTestUuid;
    const currentAllureStepResultGetter = () => this.allureRuntime.getCurrentStep(currentAllureResultUuidGetter()!);
    // @ts-ignore
    const originalExpectationHandler = globalJasmine.Spec.prototype.addExpectationResult;

    // soft-asserts support (when failed assertions don't throw errors)
    // @ts-ignore
    globalJasmine.Spec.prototype.addExpectationResult = function (passed, data, isError) {
      const isStepFailed = !passed && !isError;

      if (currentAllureStepResultGetter() && isStepFailed) {
        allureRuntime.updateStep((result) => {
          result.status = Status.FAILED;
          result.stage = Stage.FINISHED;
        }, currentAllureResultUuidGetter()!);
      }

      originalExpectationHandler.call(this, passed, data, isError);
    };
  }

  suiteStarted(suite: jasmine.SuiteResult): void {
    this.jasmineSuitesStack.push(suite);
    this.allureRuntime.startScope();
  }

  suiteDone(): void {
    this.jasmineSuitesStack.pop();
    this.allureRuntime.writeScope();
  }

  specStarted(spec: jasmine.SpecResult): void {
    this.currentAllureTestUuid = this.allureRuntime.startTest({
      name: spec.description,
      fullName: this.getSpecFullName(spec),
      stage: Stage.RUNNING,
    });
  }

  specDone(spec: jasmine.SpecResult): void {
    const specPath = this.getCurrentSpecPath();
    const exceptionInfo = findMessageAboutThrow(spec.failedExpectations) || findAnyError(spec.failedExpectations);

    this.allureRuntime.updateTest((result) => {
      const suitesLabels = getSuiteLabels(specPath);

      result.labels.push(...suitesLabels);

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
    }, this.currentAllureTestUuid!);
    this.allureRuntime.stopTest({ uuid: this.currentAllureTestUuid! });
    this.allureRuntime.writeTest(this.currentAllureTestUuid!);
    this.currentAllureTestUuid = undefined;
  }

  jasmineDone(): void {
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
    // write global container
    this.allureRuntime.writeScope();
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

                this.allureRuntime.startFixture(fixtureType, {
                  name: fixtureName,
                  stage: Stage.FINISHED,
                  status: Status.PASSED,
                  start,
                });
                this.allureRuntime.stopFixture();
              })
              .catch((err) => {
                done.fail(err as Error);

                this.allureRuntime.startFixture(fixtureType, {
                  name: fixtureName,
                  stage: Stage.FINISHED,
                  status: Status.BROKEN,
                  start,
                });
                this.allureRuntime.stopFixture();
              });
          } else {
            try {
              done();

              this.allureRuntime.startFixture(fixtureType, {
                name: fixtureName,
                stage: Stage.FINISHED,
                status: Status.PASSED,
                start,
              });
              this.allureRuntime.stopFixture();
            } catch (err) {
              const { message, stack } = err as Error;

              this.allureRuntime.startFixture(fixtureType, {
                name: fixtureName,
                stage: Stage.FINISHED,
                status: Status.BROKEN,
                statusDetails: {
                  message,
                  trace: stack,
                },
                start,
              });
              this.allureRuntime.stopFixture();

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
