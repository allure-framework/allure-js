import { cwd } from "node:process";
import {
  AllureNodeReporterRuntime,
  Attachment,
  ContentType,
  FileSystemAllureWriter,
  Label,
  LabelName,
  Link,
  LinkType,
  MessageAllureWriter,
  Parameter,
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
import { AllureJasmineConfig } from "./model.js";

// eslint-disable-next-line no-undef
import FailedExpectation = jasmine.FailedExpectation;

interface JasmineSpecResult extends jasmine.SpecResult {
  parentSuiteId?: string;
  filename: string;
}

interface JasmineSuiteResult extends jasmine.SuiteResult {
  filename: string;
}

const findAnyError = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  expectations = expectations || [];
  if (expectations.length > 0) {
    return expectations[0];
  }
  return null;
};

const findMessageAboutThrow = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  for (const e of expectations || []) {
    if (e.matcherName === "") {
      return e;
    }
  }
  return null;
};

/* eslint-disable no-shadow */
enum SpecStatus {
  PASSED = "passed",
  FAILED = "failed",
  BROKEN = "broken",
  PENDING = "pending",
  DISABLED = "disabled",
  EXCLUDED = "excluded",
}

type JasmineBeforeAfterFn = (action: (done: DoneFn) => void, timeout?: number) => void;

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
          status: getStatusFromError(err as Error),
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            message: (err as Error).message,
            trace: (err as Error).stack,
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
    this.allureJasmineReporter.handleAllureRuntimeMessages([message]);

    await Promise.resolve();
  }
}

export default class AllureJasmineReporter implements jasmine.CustomReporter {
  // private groupStack: AllureGroup[] = [];
  // private labelStack: Label[][] = [[]];
  // private runningTest: AllureTest | null = null;
  // private stepStack: AllureStep[] = [];
  // private runningExecutable: ExecutableItemWrapper | null = null;
  private jasmineSuites: Map<string, jasmine.SuiteResult> = new Map();
  private readonly allureRuntime: AllureNodeReporterRuntime;
  private currentAllureTestUuid?: string;

  constructor(config: AllureJasmineConfig) {
    const { testMode, resultsDir = "./allure-results", ...restConfig } = config || {};

    // console.log("cwd", cwd());

    this.allureRuntime = new AllureNodeReporterRuntime({
      writer: testMode
        ? new MessageAllureWriter()
        : new FileSystemAllureWriter({
            resultsDir,
          }),
    });

    const testRuntime = new AllureJasmineTestRuntime(this);

    setGlobalTestRuntime(testRuntime);

    // TODO:
    // this.installHooks();
  }

  private getSpecPath(spec: JasmineSpecResult) {
    const path: string[] = [];
    let currentSuiteId = spec.parentSuiteId;

    while (currentSuiteId) {
      const currentSuite = this.jasmineSuites.get(currentSuiteId);

      // @ts-ignore
      currentSuiteId = currentSuite?.parentSuiteId;

      path.unshift(currentSuite?.fullName || "");
    }

    return path.filter(Boolean).reduce(
      ([acc, lastPath], currentPath) => {
        const newSpecPath = acc.concat(currentPath.replace(lastPath as string, "").trim());

        return [newSpecPath, currentPath];
      },
      [[] as string[], ""],
    )[0] as string[];
  }

  private getSpecFullName(spec: JasmineSpecResult) {
    const specFilename = spec.filename.replace(cwd(), "").replace(/^[/\\]/, "");
    const specPath = this.getSpecPath(spec).concat(spec.description).join(" > ");

    return `${specFilename}#${specPath}`;
  }

  handleAllureRuntimeMessages(messages: RuntimeMessage[]) {
    this.allureRuntime.applyRuntimeMessages(this.currentAllureTestUuid!, messages);
  }

  // get currentGroup(): AllureGroup {
  //   const currentGroup = this.getCurrentGroup();
  //   if (currentGroup === null) {
  //     throw new Error("No active group");
  //   }
  //   return currentGroup;
  // }

  // getInterface(): Allure {
  //   return new JasmineAllureInterface(this, this.runtime);
  // }

  // get currentTest(): AllureTest {
  //   if (this.runningTest === null) {
  //     throw new Error("No active test");
  //   }
  //   return this.runningTest;
  // }

  // get currentExecutable(): ExecutableItemWrapper | null {
  //   return this.runningExecutable;
  // }

  // writeAttachment(content: Buffer | string, options: ContentType | string | AttachmentOptions): string {
  //   return this.runtime.writeAttachment(content, options);
  // }

  jasmineStarted(): void {}

  suiteStarted(suite: jasmine.CustomReporterResult): void {
    this.jasmineSuites.set(suite.id, suite);
  }

  specStarted(result: JasmineSpecResult): void {
    this.currentAllureTestUuid = this.allureRuntime.start({
      name: result.description,
      fullName: this.getSpecFullName(result),
      stage: Stage.RUNNING,
    });
  }

  specDone(spec: JasmineSpecResult): void {
    this.allureRuntime.update(this.currentAllureTestUuid!, (result) => {
      const suitesLabels = getSuiteLabels(this.getSpecPath(spec));

      result.labels.push(...suitesLabels);

      if (
        spec.status === SpecStatus.PENDING ||
        spec.status === SpecStatus.DISABLED ||
        spec.status === SpecStatus.EXCLUDED
      ) {
        result.status = Status.SKIPPED;
        result.stage = Stage.PENDING;
        result.statusDetails = {
          message: spec.pendingReason || "Suite disabled",
        };
        return;
      }

      result.stage = Stage.FINISHED;

      if (spec.status === Status.PASSED) {
        result.status = Status.PASSED;
        return;
      }

      const exceptionInfo = findMessageAboutThrow(spec.failedExpectations) || findAnyError(spec.failedExpectations);

      if (exceptionInfo !== null) {
        result.statusDetails = {
          message: exceptionInfo.message,
          trace: exceptionInfo.stack,
        };
      }

      if (spec.status === SpecStatus.FAILED) {
        result.status = Status.FAILED;
        return;
      }

      if (spec.status === SpecStatus.BROKEN) {
        result.status = Status.BROKEN;
        return;
      }
    });
    this.allureRuntime.stop(this.currentAllureTestUuid!);
    this.allureRuntime.write(this.currentAllureTestUuid!);
  }

  suiteDone(): void {
    // console.log("suite done", this.currentAllureTestUuid);
    // if (this.runningTest !== null) {
    //   // eslint-disable-next-line no-console
    //   console.error("Allure reporter issue: running test on suiteDone");
    // }
    //
    // const currentGroup = this.getCurrentGroup();
    // if (currentGroup === null) {
    //   throw new Error("No active suite");
    // }
    //
    // currentGroup.endGroup();
    // this.groupStack.pop();
    // this.labelStack.pop();
  }

  jasmineDone(): void {}

  // addLabel(name: string, value: string): void {
  //   if (this.labelStack.length) {
  //     this.labelStack[this.labelStack.length - 1].push({ name, value });
  //   }
  // }
  //
  // pushStep(step: AllureStep): void {
  //   this.stepStack.push(step);
  // }
  //
  // popStep(): void {
  //   this.stepStack.pop();
  // }
  //
  // get currentStep(): AllureStep | null {
  //   if (this.stepStack.length > 0) {
  //     return this.stepStack[this.stepStack.length - 1];
  //   }
  //   return null;
  // }
  //
  // private getCurrentGroup(): AllureGroup | null {
  //   if (this.groupStack.length === 0) {
  //     return null;
  //   }
  //   return this.groupStack[this.groupStack.length - 1];
  // }

  private installHooks(): void {
    // const jasmineBeforeAll: JasmineBeforeAfterFn = global.beforeAll;
    // const jasmineAfterAll: JasmineBeforeAfterFn = global.afterAll;
    // const jasmineBeforeEach: JasmineBeforeAfterFn = global.beforeEach;
    // const jasmineAfterEach: JasmineBeforeAfterFn = global.afterEach;
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
    // const wrapperBeforeAll = makeWrapperAll(jasmineBeforeAll, () => {
    //   return this.currentGroup.addBefore();
    // });
    // const wrapperAfterAll = makeWrapperAll(jasmineAfterAll, () => {
    //   return this.currentGroup.addAfter();
    // });
    // const wrapperBeforeEach = makeWrapperAll(jasmineBeforeEach, () => {
    //   return this.currentGroup.addBefore();
    // });
    // const wrapperAfterEach = makeWrapperAll(jasmineAfterEach, () => {
    //   return this.currentGroup.addAfter();
    // });
    // global.beforeAll = wrapperBeforeAll;
    // global.afterAll = wrapperAfterAll;
    // global.beforeEach = wrapperBeforeEach;
    // global.afterEach = wrapperAfterEach;
  }
}
