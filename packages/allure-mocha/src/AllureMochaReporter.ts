import * as Mocha from "mocha";
import type { AttachmentOptions, ContentType, Label } from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { Category, RuntimeMessage } from "allure-js-commons/sdk";
import { getStatusFromError } from "allure-js-commons/sdk";
import type { Config } from "allure-js-commons/sdk/reporter";
import {
  FileSystemWriter,
  ReporterRuntime,
  ensureSuiteLabels,
  getEnvironmentLabels,
  getPackageLabelFromPath,
  getRelativePath,
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
  getInitialLabels,
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
} = Mocha.Runner.constants;

export class AllureMochaReporter extends Mocha.reporters.Base {
  private readonly runtime: ReporterRuntime;
  private readonly testplan?: TestPlanIndices;
  private scopesStack: string[] = [];
  private currentTest?: string;
  private currentHook?: string;
  private readonly isInWorker: boolean;

  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions, isInWorker: boolean = false) {
    super(runner, opts);

    const { resultsDir = "allure-results", writer, ...restOptions }: Config = opts.reporterOptions || {};

    this.isInWorker = isInWorker;
    this.runtime = new ReporterRuntime({
      writer: writer || new FileSystemWriter({ resultsDir }),
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
    const globalLabels = getEnvironmentLabels().filter((label) => !!label.value);
    const initialLabels: Label[] = getInitialLabels();
    const metaLabels = getAllureMetaLabels(test);
    const labels = globalLabels.concat(initialLabels, metaLabels);

    if (test.file) {
      const testPath = getRelativePath(test.file);
      const packageLabelFromPath: Label = getPackageLabelFromPath(testPath);
      labels.push(packageLabelFromPath);
    }

    const scopeUuid = this.runtime.startScope();
    setTestScope(test, scopeUuid);

    this.currentTest = this.runtime.startTest(
      {
        name: getAllureDisplayName(test),
        stage: Stage.RUNNING,
        fullName: getAllureFullName(test),
        labels,
        testCaseId: getTestCaseId(test),
      },
      [...this.scopesStack, scopeUuid],
    );
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
        message: error.message,
        trace: error.stack,
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
          message: error.message,
          trace: error.stack,
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
}
