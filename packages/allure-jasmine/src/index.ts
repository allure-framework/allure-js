import { cwd } from "node:process";
import {
  AllureNodeReporterRuntime,
  ContentType,
  FileSystemAllureWriter,
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
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";
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

  handleAllureRuntimeMessages(message: RuntimeMessage) {
    this.allureRuntime.applyRuntimeMessages(this.currentAllureTestUuid!, [message]);
  }

  jasmineStarted(): void {
    const allureRuntime = this.allureRuntime;
    const globalJasmine = globalThis.jasmine;
    const currentAllureResultUuidGetter = () => this.currentAllureTestUuid;
    const currentAllureStepResultGetter = () =>
      this.allureRuntime.state.getCurrentStep(currentAllureResultUuidGetter()!);
    // @ts-ignore
    const originalExpectationHandler = globalJasmine.Spec.prototype.addExpectationResult;

    // @ts-ignore
    globalJasmine.Spec.prototype.addExpectationResult = function (passed, data, isError) {
      if (currentAllureStepResultGetter()) {
        allureRuntime.updateStep(currentAllureResultUuidGetter()!, (result) => {
          if (!passed && !isError) {
            result.status = Status.FAILED;
            result.stage = Stage.FINISHED;
          }
        });
      }

      originalExpectationHandler.call(this, passed, data, isError);
    };
  }

  suiteStarted(suite: jasmine.SuiteResult): void {
    this.jasmineSuitesStack.push(suite);
  }

  suiteDone(): void {
    this.jasmineSuitesStack.pop();
  }

  specStarted(spec: jasmine.SpecResult): void {
    this.currentAllureTestUuid = this.allureRuntime.start({
      name: spec.description,
      fullName: this.getSpecFullName(spec),
      stage: Stage.RUNNING,
    });
  }

  specDone(spec: jasmine.SpecResult): void {
    const specPath = this.getCurrentSpecPath();
    const exceptionInfo = findMessageAboutThrow(spec.failedExpectations) || findAnyError(spec.failedExpectations);

    this.allureRuntime.update(this.currentAllureTestUuid!, (result) => {
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
    });

    this.allureRuntime.stop(this.currentAllureTestUuid!);
    this.allureRuntime.write(this.currentAllureTestUuid!);
    this.currentAllureTestUuid = undefined;
  }

  jasmineDone(): void {
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
  }

  private installHooks(): void {
    // const jasmineBeforeAll: JasmineBeforeAfterFn = global.beforeAll;
    // const jasmineAfterAll: JasmineBeforeAfterFn = global.afterAll;
    // const jasmineBeforeEach: JasmineBeforeAfterFn = global.beforeEach;
    // const jasmineAfterEach: JasmineBeforeAfterFn = global.afterEach;
    //
    // const makeWrapperAll = (wrapped: JasmineBeforeAfterFn, fun: () => ExecutableItemWrapper) => {
    //   return (action: (done: DoneFn) => void, timeout?: number): void => {
    //     try {
    //       this.runningExecutable = fun();
    //     } catch {
    //       wrapped(action, timeout);
    //       return;
    //     }
    //
    //     wrapped((done) => {
    //       let ret;
    //       if (action.length > 0) {
    //         // function takes done callback
    //         ret = this.runningExecutable!.wrap(
    //           () =>
    //             // eslint-disable-next-line no-undef
    //             new Promise((resolve, reject) => {
    //               const t: any = resolve;
    //               t.fail = reject;
    //               // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    //               action(t);
    //             }),
    //         )();
    //       } else {
    //         ret = this.runningExecutable!.wrap(action)();
    //       }
    //       if (isPromise(ret)) {
    //         (ret as Promise<any>)
    //           .then(() => {
    //             this.runningExecutable = null;
    //             done();
    //           })
    //           .catch((e) => {
    //             this.runningExecutable = null;
    //             // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    //             done.fail(e);
    //           });
    //       } else {
    //         this.runningExecutable = null;
    //         done();
    //       }
    //     }, timeout);
    //   };
    // };
    // global.beforeAll = makeWrapperAll(jasmineBeforeAll, () => {
    //   // return this.currentGroup.addBefore();
    // });
    // global.afterAll = makeWrapperAll(jasmineAfterAll, () => {
    //   // return this.currentGroup.addAfter();
    // });
    // global.beforeEach = makeWrapperAll(jasmineBeforeEach, () => {
    //   // return this.currentGroup.addBefore();
    // });
    // global.afterEach = makeWrapperAll(jasmineAfterEach, () => {
    //   // return this.currentGroup.addAfter();
    // });
  }
}
