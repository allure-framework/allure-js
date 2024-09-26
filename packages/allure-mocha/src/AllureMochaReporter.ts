import * as Mocha from "mocha";
import { env } from "node:process";
import { type AttachmentOptions, type ContentType, type Label, type Parameter } from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { Category, RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import { getHostLabel, getThreadLabel } from "allure-js-commons/sdk/reporter";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  ReporterRuntime,
  createDefaultWriter,
  ensureSuiteLabels,
  getEnvironmentLabels,
  getFrameworkLabel,
  getLanguageLabel,
  getPackageLabel,
} from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { MochaTestRuntime } from "./MochaTestRuntime.js";
import { setLegacyApiRuntime } from "./legacyUtils.js";
import type { TestPlanIndices } from "./types.js";
import {
  applyTestPlan,
  createTestPlanIndices,
  getAllureDisplayName,
  getAllureFullName,
  getAllureMetaLabels,
  getHookType,
  getSuitesOfMochaTest,
  getTestCaseId,
  getTestScope,
  isIncludedInTestRun,
  resolveParallelModeSetupFile,
  setTestScope,
} from "./utils.js";

const {
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_END,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  EVENT_TEST_PENDING,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
  EVENT_TEST_RETRY,
} = Mocha.Runner.constants;

export class AllureMochaReporter extends Mocha.reporters.Base {
  protected readonly runtime: ReporterRuntime;
  protected readonly testplan?: TestPlanIndices;
  protected readonly testsMap: Map<string, Mocha.Test> = new Map();
  protected scopesStack: string[] = [];
  protected currentTest?: string;
  protected currentHook?: string;
  private readonly isInWorker: boolean;

  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions, isInWorker: boolean = false) {
    super(runner, opts);

    const { resultsDir, ...restOptions }: ReporterConfig = opts.reporterOptions || {};

    this.isInWorker = isInWorker;
    this.runtime = new ReporterRuntime({
      writer: createDefaultWriter({ resultsDir }),
      ...restOptions,
    });
    this.testplan = createTestPlanIndices();

    const testRuntime = new MochaTestRuntime(this.applyRuntimeMessages);

    setGlobalTestRuntime(testRuntime);
    setLegacyApiRuntime(this);

    if (opts.parallel) {
      opts.require = [...(opts.require ?? []), resolveParallelModeSetupFile()];
    } else {
      this.applyListeners();
    }
  }

  applyRuntimeMessages = (...message: RuntimeMessage[]) => {
    const root = this.currentHook ?? this.currentTest;
    if (root) {
      this.runtime.applyRuntimeMessages(root, message);
    }
  };

  /**
   * @deprecated for removal. Use reporter config option instead.
   */
  writeCategoriesDefinitions = (categories: Category[]) => {
    this.runtime.categories = categories;
    if (this.isInWorker) {
      // done is not called in a worker; emit the file immediately
      this.runtime.writeCategoriesDefinitions();
    }
  };

  /**
   * @deprecated for removal. Use reporter config option instead.
   */
  writeEnvironmentInfo = (environmentInfo: Record<string, string>) => {
    this.runtime.environmentInfo = environmentInfo;
    if (this.isInWorker) {
      // done is not called in a worker; emit the file immediately
      this.runtime.writeEnvironmentInfo();
    }
  };

  /**
   * @deprecated for removal. Use reporter config option instead.
   */
  testAttachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) => {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }
    const opts = typeof options === "string" ? { contentType: options } : options;
    const encoding = opts.encoding ?? "utf8";
    const buffer = typeof content === "string" ? Buffer.from(content, encoding) : content;
    this.runtime.writeAttachment(root, null, name, buffer, { ...opts, wrapInStep: false });
  };

  override done(failures: number, fn?: ((failures: number) => void) | undefined): void {
    this.runtime.writeEnvironmentInfo();
    this.runtime.writeCategoriesDefinitions();
    return fn?.(failures);
  }

  private applyListeners = () => {
    this.runner
      .on(EVENT_SUITE_BEGIN, this.onSuite)
      .on(EVENT_SUITE_END, this.onSuiteEnd)
      .on(EVENT_TEST_BEGIN, this.onTest)
      .on(EVENT_TEST_PASS, this.onPassed)
      .on(EVENT_TEST_FAIL, this.onFailed)
      .on(EVENT_TEST_RETRY, this.onFailed)
      .on(EVENT_TEST_PENDING, this.onPending)
      .on(EVENT_TEST_END, this.onTestEnd)
      .on(EVENT_HOOK_BEGIN, this.onHookStart)
      .on(EVENT_HOOK_END, this.onHookEnd);
  };

  private onSuite = (suite: Mocha.Suite) => {
    if (!suite.parent && this.testplan) {
      applyTestPlan(this.testplan.idIndex, this.testplan.fullNameIndex, suite);
    }
    const scopeUuid = this.runtime.startScope();
    this.scopesStack.push(scopeUuid);
  };

  private onSuiteEnd = (suite: Mocha.Suite) => {
    this.writeTestScopes(suite);
    const scopeUuid = this.scopesStack.pop();
    if (scopeUuid) {
      this.runtime.writeScope(scopeUuid);
    }
  };

  private onTest = (test: Mocha.Test) => {
    if (this.currentTest) {
      const retriedTest = this.testsMap.get(this.currentTest);
      if (retriedTest) {
        this.onTestEnd(retriedTest);
        const testScope = getTestScope(retriedTest);
        if (testScope) {
          this.runtime.writeScope(testScope);
        }
      }
      this.testsMap.delete(this.currentTest);
      this.currentTest = undefined;
    }

    const globalLabels = getEnvironmentLabels().filter((label) => !!label.value);
    const initialLabels: Label[] = [
      getLanguageLabel(),
      getFrameworkLabel(this.getFrameworkName()),
      getHostLabel(),
      getThreadLabel(this.getWorkerId()),
    ];
    const metaLabels = getAllureMetaLabels(test);
    const labels = globalLabels.concat(initialLabels, metaLabels);

    if (test.file) {
      const packageLabel: Label = getPackageLabel(test.file);
      labels.push(packageLabel);
    }

    const scopeUuid = this.runtime.startScope();
    setTestScope(test, scopeUuid);

    // @ts-ignore
    const retryNum = "currentRetry" in test ? test.currentRetry() : 0;
    const parameters: Parameter[] = retryNum ? [{ name: "Retry", value: `${retryNum}`, excluded: true }] : [];

    this.currentTest = this.runtime.startTest(
      {
        name: getAllureDisplayName(test),
        stage: Stage.RUNNING,
        fullName: getAllureFullName(test),
        labels,
        testCaseId: getTestCaseId(test),
        parameters: parameters,
      },
      [...this.scopesStack, scopeUuid],
    );
    this.testsMap.set(this.currentTest, test);
  };

  private onPassed = () => {
    if (!this.currentTest) {
      return;
    }
    this.runtime.updateTest(this.currentTest, (r) => {
      r.status = Status.PASSED;
    });
  };

  private onFailed = (_: Mocha.Test, error: Error) => {
    if (!this.currentTest) {
      return;
    }
    this.runtime.updateTest(this.currentTest, (r) => {
      r.status = getStatusFromError(error);
      r.statusDetails = {
        ...r.statusDetails,
        ...getMessageAndTraceFromError(error),
      };
    });
  };

  private onPending = (test: Mocha.Test) => {
    if (isIncludedInTestRun(test)) {
      if (!this.currentTest) {
        this.onTest(test);
      }
      this.runtime.updateTest(this.currentTest!, (r) => {
        r.status = Status.SKIPPED;
        r.statusDetails = {
          message: "Test skipped",
        };
      });
    }
  };

  private onTestEnd = (test: Mocha.Test) => {
    if (!this.currentTest) {
      return;
    }
    if (isIncludedInTestRun(test)) {
      const defaultSuites = getSuitesOfMochaTest(test);
      this.runtime.updateTest(this.currentTest, (t) => {
        ensureSuiteLabels(t, defaultSuites);
        t.stage = Stage.FINISHED;
      });
      this.runtime.stopTest(this.currentTest);
      this.runtime.writeTest(this.currentTest);
      this.testsMap.delete(this.currentTest);
      this.currentTest = undefined;

      // We're writing the test's dedicated scope in onSuiteEnd instead of here
      // because there might be afterEach hooks, which are reported after
      // onTestEnd, not before.
    }
  };

  private onHookStart = (hook: Mocha.Hook) => {
    const [hookCategory, hookScope] = getHookType(hook);
    const test = hook.ctx?.currentTest;
    const scopeUuid = hookScope === "each" && test ? getTestScope(test) : this.getCurrentSuiteScope();
    if (!scopeUuid) {
      return;
    }

    const name = hook.originalTitle ?? hook.title ?? "";
    if (hookCategory) {
      this.currentHook = this.runtime.startFixture(scopeUuid, hookCategory, { name });
    }
  };

  private onHookEnd = (hook: Mocha.Hook) => {
    if (!this.currentHook) {
      return;
    }
    this.runtime.updateFixture(this.currentHook, (r) => {
      const error: Error | undefined = hook.error();
      if (error) {
        r.status = getStatusFromError(error);
        r.statusDetails = {
          ...r.statusDetails,
          ...getMessageAndTraceFromError(error),
        };
      } else {
        r.status = Status.PASSED;
      }
    });
    this.runtime.stopFixture(this.currentHook);
    this.currentHook = undefined;
  };

  private writeTestScopes = (suite: Mocha.Suite) => {
    suite.tests.forEach((test) => {
      const testScopeUuid = getTestScope(test);
      if (testScopeUuid) {
        this.runtime.writeScope(testScopeUuid);
      }
    });
  };

  private getCurrentSuiteScope = () =>
    this.scopesStack.length > 0 ? this.scopesStack[this.scopesStack.length - 1] : undefined;

  protected getFrameworkName = (): string => "mocha";

  protected getWorkerId = (): string | undefined => env.MOCHA_WORKER_ID;
}
