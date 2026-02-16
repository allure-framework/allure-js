import type Cypress from "cypress";
import { ContentType, Stage, Status } from "allure-js-commons";
import type { FixtureResult, TestResult } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { isGlobalRuntimeMessage } from "allure-js-commons/sdk";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getPosixPath,
  getProjectRoot,
  getRelativePath,
  getSuiteLabels,
  getThreadLabel,
  parseTestPlan,
} from "allure-js-commons/sdk/reporter";
import type {
  AllureCypressConfig,
  AllureCypressTaskArgs,
  AllureSpecState,
  CypressFailMessage,
  CypressHookEndMessage,
  CypressHookStartMessage,
  CypressSkippedTestMessage,
  CypressStepFinalizeMessage,
  CypressStepStartMessage,
  CypressStepStopMessage,
  CypressSuiteEndMessage,
  CypressSuiteStartMessage,
  CypressTestEndMessage,
  CypressTestSkipMessage,
  CypressTestStartMessage,
  SpecContext,
} from "./types.js";
import { DEFAULT_RUNTIME_CONFIG, last } from "./utils.js";

export class AllureCypress {
  allureRuntime: ReporterRuntime;
  specContextByAbsolutePath = new Map<string, SpecContext>();
  videoOnFailOnly: boolean = false;

  constructor(config: AllureCypressConfig = {}) {
    const { resultsDir, videoOnFailOnly = false, ...rest } = config;

    this.videoOnFailOnly = videoOnFailOnly;
    this.allureRuntime = new ReporterRuntime({
      writer: createDefaultWriter({ resultsDir }),
      ...rest,
    });
  }

  attachToCypress = (on: Cypress.PluginEvents) => {
    on("task", {
      reportAllureCypressSpecMessages: (args: AllureCypressTaskArgs) => {
        this.#applyAllureCypressMessages(args);
        return null;
      },
      reportFinalAllureCypressSpecMessages: (args: AllureCypressTaskArgs) => {
        this.#applyAllureCypressMessages(args);
        if (args.isInteractive) {
          // In non-interactive mode the spec is ended via the 'after:spec' event instead
          // to get the spec's video.
          this.endSpec(args.absolutePath);
        }
        return null;
      },
    });

    // Emits the remaining fixtures and writes the video of the spec.
    // In interactive mode it's invoked through the `reportFinalAllureCypressSpecMessages` task.
    on("after:spec", this.onAfterSpec);

    // Emits the categories and env info. Doesn't work in interactive mode unless
    // `experimentalInteractiveRunEvents` is set.
    on("after:run", this.onAfterRun);
  };

  /**
   * Forward the `after:spec` event into Allure Cypress using this function if
   * you need to define your own handler or combine Allure Cypress with other
   * plugins. More info [here](https://github.com/allure-framework/allure-js/blob/main/packages/allure-cypress/README.md#setupnodeevents-limitations).
   * @param spec The first argument of the `after:spec` event.
   * @param results The second argument of the `after:spec` event. It's `undefined` in interactive mode.
   * @example
   * ```javascript
   * import { defineConfig } from "cypress";
   * import { allureCypress } from "allure-cypress/reporter";
   *
   * export default defineConfig({
   *   setupNodeEvents: (on, config) => {
   *     const allureReporter = allureCypress(on, config);
   *     on("after:spec", (spec, results) => {
   *       allureReporter.onAfterSpec(spec, results);
   *     });
   *     return config;
   *   }
   *   // ...
   * });
   * ```
   */
  onAfterSpec = (spec: Cypress.Spec, results: CypressCommandLine.RunResult | undefined) => {
    this.endSpec(spec.absolute, results?.video ?? undefined);
  };

  /**
   * Forward the `after:run` event into Allure Cypress using this function if
   * you need to define your own handler or combine Allure Cypress with other
   * plugins. More info [here](https://github.com/allure-framework/allure-js/blob/main/packages/allure-cypress/README.md#setupnodeevents-limitations).
   * @param results The argument of the `after:run` event. It's `undefined` in interactive mode.
   * @example
   * ```javascript
   * import { defineConfig } from "cypress";
   * import { allureCypress } from "allure-cypress/reporter";
   *
   * export default defineConfig({
   *   setupNodeEvents: (on, config) => {
   *     const allureReporter = allureCypress(on, config);
   *     on("after:run", (results) => {
   *       allureReporter.onAfterRun(results);
   *     });
   *     return config;
   *   }
   *   // ...
   * });
   * ```
   */
  onAfterRun = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    results: CypressCommandLine.CypressFailedRunResult | CypressCommandLine.CypressRunResult | undefined,
  ) => {
    this.endRun();
  };

  endRun = () => {
    this.#endAllSpecs();
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
    this.allureRuntime.writeGlobalInfo();
  };

  endSpec = (specAbsolutePath: string, cypressVideoPath?: string) => {
    const specContext = this.specContextByAbsolutePath.get(specAbsolutePath);
    if (specContext) {
      this.#attachSpecVideo(specContext, cypressVideoPath);
      this.#emitRemainingScopes(specContext);
      this.specContextByAbsolutePath.delete(specAbsolutePath);
    }
  };

  #endAllSpecs = () => {
    for (const specAbsolutePath of this.specContextByAbsolutePath.keys()) {
      this.endSpec(specAbsolutePath);
    }
  };

  #applyAllureCypressMessages = ({ messages, absolutePath }: AllureCypressTaskArgs) => {
    messages.forEach((message) => {
      if (message.type === "cypress_run_start") {
        this.#startRun(absolutePath);
        return;
      }

      const context = this.specContextByAbsolutePath.get(absolutePath);
      if (!context) {
        return;
      }

      switch (message.type) {
        case "cypress_suite_start":
          this.#startSuite(context, message);
          break;
        case "cypress_suite_end":
          this.#stopSuite(context, message);
          break;
        case "cypress_hook_start":
          this.#startHook(context, message);
          break;
        case "cypress_hook_end":
          this.#stopHook(context, message);
          break;
        case "cypress_test_start":
          this.#startTest(context, message);
          break;
        case "cypress_test_pass":
          this.#passTest(context);
          break;
        case "cypress_fail":
          this.#failHookAndTest(context, message);
          break;
        case "cypress_test_skip":
          this.#skipTest(context, message);
          break;
        case "cypress_skipped_test":
          this.#addSkippedTest(context, message);
          break;
        case "cypress_test_end":
          this.#stopTest(context, message);
          break;
        case "cypress_step_start":
          this.#startStep(context, message.data);
          break;
        case "cypress_step_stop":
          this.#stopStep(context, message.data);
          break;
        case "cypress_step_finalize":
          this.#finalizeStep(context, message.data);
          break;
        default:
          this.#applyRuntimeApiMessages(context, message);
          break;
      }
    });
  };

  #startRun = (absolutePath: string) => {
    // This function is executed once on `cypress run`, but it can be executed
    // multiple times during an interactive session (`cypress open`). Ideally,
    // in that case, we should remove previous result objects that haven't been
    // written yet, but it would've required support in ReporterRuntime.
    // Currently, we're discarding the entire spec context.
    this.#initializeSpecContext(absolutePath);
  };

  #startSuite = (context: SpecContext, { data: { id, name, root } }: CypressSuiteStartMessage) => {
    this.#pushNewSuiteScope(context, id);
    if (!root) {
      this.#emitPreviousTestScope(context);
      context.suiteNames.push(name);
    }
  };

  #pushNewSuiteScope = (context: SpecContext, suiteId: string) => {
    const scope = this.allureRuntime.startScope();
    context.suiteScopes.push(scope);
    context.suiteIdToScope.set(suiteId, scope);
    context.suiteScopeToId.set(scope, suiteId);
    return scope;
  };

  #stopSuite = (context: SpecContext, { data: { root } }: CypressSuiteEndMessage) => {
    this.#emitPreviousTestScope(context);
    if (!root) {
      context.suiteNames.pop();
    }
    this.#writeLastSuiteScope(context);
  };

  #writeLastSuiteScope = (context: SpecContext) => {
    const scope = context.suiteScopes.pop();
    if (scope) {
      const suiteId = context.suiteScopeToId.get(scope);
      if (suiteId) {
        context.suiteScopeToId.delete(scope);
        context.suiteIdToScope.delete(suiteId);
      }
      this.allureRuntime.writeScope(scope);
    }
  };

  #startHook = (context: SpecContext, { data: { name, scopeType, position, start } }: CypressHookStartMessage) => {
    const isEach = scopeType === "each";
    const isAfterEach = position === "after" && isEach;
    if (!isAfterEach) {
      this.#emitPreviousTestScope(context);
    }

    const scope = isEach ? context.testScope : last(context.suiteScopes);
    if (scope) {
      context.fixture = this.allureRuntime.startFixture(scope, position, {
        name,
        start,
        status: undefined,
      });
    }
  };

  #stopHook = (context: SpecContext, { data: { duration } }: CypressHookEndMessage) => {
    const fixtureUuid = context.fixture;
    if (fixtureUuid) {
      this.allureRuntime.updateFixture(fixtureUuid, (fixture) => {
        fixture.status ??= Status.PASSED;
      });
      this.allureRuntime.stopFixture(fixtureUuid, { duration });
      this.#fixFixtureStepStops(fixtureUuid);
      context.fixture = undefined;
    }
  };

  #startTest = (context: SpecContext, { data: { fullNameSuffix, ...testResultData } }: CypressTestStartMessage) => {
    this.#emitPreviousTestScope(context);
    const testScope = this.allureRuntime.startScope();
    context.testScope = testScope;
    context.test = this.#addNewTestResult(context, fullNameSuffix, testResultData, [
      context.videoScope,
      ...context.suiteScopes,
      testScope,
    ]);
  };

  #addNewTestResult = (
    context: SpecContext,
    fullNameSuffix: string,
    { labels: metadataLabels = [], ...otherTestData }: Partial<TestResult>,
    scopes: string[],
  ) => {
    const posixPath = getPosixPath(context.specPath);

    return this.allureRuntime.startTest(
      {
        stage: Stage.RUNNING,
        labels: [
          getLanguageLabel(),
          getFrameworkLabel("cypress"),
          ...getSuiteLabels(context.suiteNames),
          ...metadataLabels,
          ...getEnvironmentLabels(),
          getHostLabel(),
          getThreadLabel(),
          getPackageLabel(context.specPath),
        ],
        fullName: `${posixPath}#${fullNameSuffix}`,
        titlePath: posixPath.split("/").concat(context.suiteNames),
        ...otherTestData,
      },
      scopes,
    );
  };

  #failHookAndTest = (context: SpecContext, { data: { status, statusDetails } }: CypressFailMessage) => {
    const setError = (result: object) => Object.assign(result, { status, statusDetails });

    const fixtureUuid = context.fixture;
    if (fixtureUuid) {
      this.allureRuntime.updateFixture(fixtureUuid, setError);
    }

    const testUuid = context.test;
    if (testUuid) {
      this.allureRuntime.updateTest(testUuid, setError);
    }

    context.failed = true;
  };

  #passTest = (context: SpecContext) => {
    const testUuid = context.test;
    if (testUuid) {
      this.allureRuntime.updateTest(testUuid, (testResult) => {
        testResult.status = Status.PASSED;
      });
    }
  };

  #skipTest = (context: SpecContext, { data: { statusDetails } }: CypressTestSkipMessage) => {
    const testUuid = context.test;
    if (testUuid) {
      this.allureRuntime.updateTest(testUuid, (testResult) => {
        testResult.status = Status.SKIPPED;
        if (statusDetails) {
          testResult.statusDetails = statusDetails;
        }
      });
    }
  };

  #addSkippedTest = (
    context: SpecContext,
    { data: { fullNameSuffix, suites, duration, retries, ...testResultData } }: CypressSkippedTestMessage,
  ) => {
    // Tests skipped because of a hook error may share all suites of the current context
    // or just a part thereof (if it's from a sibling suite).
    const scopes = suites.map((s) => context.suiteIdToScope.get(s)).filter((s): s is string => Boolean(s));

    const testUuid = this.#addNewTestResult(context, fullNameSuffix, testResultData, [context.videoScope, ...scopes]);
    this.#stopExistingTestResult(testUuid, { duration, retries });
    this.allureRuntime.writeTest(testUuid);
  };

  #stopTest = (context: SpecContext, { data }: CypressTestEndMessage) => {
    const testUuid = context.test;
    if (testUuid) {
      this.#stopExistingTestResult(testUuid, data);
      this.allureRuntime.writeTest(testUuid);
      context.test = undefined;
    }
  };

  #stopExistingTestResult = (testUuid: string, { retries, duration }: CypressTestEndMessage["data"]) => {
    this.allureRuntime.updateTest(testUuid, (testResult) => {
      if (retries > 0) {
        testResult.parameters.push({
          name: "Retry",
          value: retries.toString(),
          excluded: true,
        });
      }
      testResult.stage = Stage.FINISHED;
    });
    this.allureRuntime.stopTest(testUuid, { duration });
    this.#fixTestStepStops(testUuid);
  };

  #fixTestStepStops = (testUuid: string) => {
    this.allureRuntime.updateTest(testUuid, this.#fixStepStops);
  };

  #fixFixtureStepStops = (fixtureUuid: string) => {
    this.allureRuntime.updateFixture(fixtureUuid, this.#fixStepStops);
  };

  #fixStepStops = ({ stop, steps = [] }: TestResult | FixtureResult) => {
    if (stop) {
      // In some circumstances, steps becomes dangling and are stopped at the test end/hook end events, which happen
      // chronologically after the test or fixture ends. This leads to the steps' stop time being greater than the one
      // of the test/fixture.
      // The only steps that may be affected are the rightmost descendants of the test/fixture.
      for (let step = steps.at(-1); step; step = step.steps.at(-1)) {
        if (step.stop && step.stop > stop) {
          step.stop = stop;
        } else {
          // Steps are always stopped child-to-parent. If a step's stop time is OK, its substeps are also correct.
          return;
        }
      }
    }
  };

  #startStep = (context: SpecContext, { id, ...properties }: CypressStepStartMessage["data"]) => {
    const rootUuid = this.#resolveRootUuid(context);
    if (rootUuid) {
      const stepUuid = this.allureRuntime.startStep(rootUuid, undefined, properties);
      if (stepUuid) {
        context.stepsByFrontEndId.set(id, stepUuid);
      }
    }
  };

  #stopStep = (context: SpecContext, { id, stop, ...properties }: CypressStepStopMessage["data"]) => {
    const stepUuid = context.stepsByFrontEndId.get(id);
    if (stepUuid) {
      this.allureRuntime.updateStep(stepUuid, (r) => {
        Object.assign(r, properties);
      });
      this.allureRuntime.stopStep(stepUuid, { stop });
    }
  };

  #finalizeStep = (context: SpecContext, { id, ...properties }: CypressStepFinalizeMessage["data"]) => {
    const stepUuid = context.stepsByFrontEndId.get(id);
    if (stepUuid) {
      this.allureRuntime.updateStep(stepUuid, (r) => {
        Object.assign(r, properties);
      });
      context.stepsByFrontEndId.delete(id);
    }
  };

  #applyRuntimeApiMessages = (context: SpecContext, message: RuntimeMessage) => {
    const rootUuid = this.#resolveRootUuid(context);
    if (!rootUuid && !isGlobalRuntimeMessage(message)) {
      return;
    }
    this.allureRuntime.applyRuntimeMessages(rootUuid, [message]);
  };

  /**
   * We must defer emitting a test's scope until we receive all the test's `afterEach` hooks.
   * At the same time, we should report it as early as we can. That means we should call this
   * method in the following cases:
   * - when an `after` hook of the test starts (`after` hooks are called later than `afterEach`)
   * - when a `before` or `beforeEach` hook of the next test starts (in case the next test has `before`/`beforeEach` hooks)
   * - when the next test starts (in case the next test doesn't have `before`/`beforeEach` hooks)
   * - when the test's suite ends (in case the test is the last one in its suite, including the root suite of the spec)
   * - when a nested suite starts
   * - when the spec ends
   */
  #emitPreviousTestScope = (context: SpecContext) => {
    const testScope = context.testScope;

    // Checking the test allows us to tell `beforeEach` and `afterEach` apart.
    // Here we're interested in `afterEach` only.
    if (!context.test && testScope) {
      this.allureRuntime.writeScope(testScope);
      context.testScope = undefined;
    }
  };

  #resolveRootUuid = (context: SpecContext) => context.fixture ?? context.test;

  #attachSpecVideo = (context: SpecContext, cypressVideoPath?: string) => {
    const shouldVideoBeAttached = (!this.videoOnFailOnly || context.failed) && cypressVideoPath;
    if (shouldVideoBeAttached) {
      const fixtureUuid = this.allureRuntime.startFixture(context.videoScope, "after", {
        name: "Cypress video",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      })!;
      this.allureRuntime.writeAttachment(fixtureUuid, undefined, "Cypress video", cypressVideoPath, {
        contentType: ContentType.MP4,
      });
      this.allureRuntime.stopFixture(fixtureUuid);
      this.allureRuntime.writeScope(context.videoScope);
    }
  };

  #emitRemainingScopes = (context: SpecContext) => {
    this.#emitPreviousTestScope(context);
    context.suiteScopes.forEach((scope) => {
      this.allureRuntime.writeScope(scope);
    });
  };

  #initializeSpecContext = (absolutePath: string) => {
    const specPath = getRelativePath(absolutePath);
    const context: SpecContext = {
      specPath,
      test: undefined,
      fixture: undefined,
      stepsByFrontEndId: new Map(),
      videoScope: this.allureRuntime.startScope(),
      suiteIdToScope: new Map(),
      suiteScopeToId: new Map(),
      suiteScopes: [],
      testScope: undefined,
      suiteNames: [],
      failed: false,
    };
    this.specContextByAbsolutePath.set(absolutePath, context);
  };
}

const createRuntimeState = (allureConfig?: AllureCypressConfig): AllureSpecState => ({
  config: getRuntimeConfigDefaults(allureConfig),
  initialized: false,
  messages: [],
  testPlan: parseTestPlan(),
  projectDir: getProjectRoot(),
  stepStack: [],
  stepsToFinalize: [],
  nextApiStepId: 0,
});

const getRuntimeConfigDefaults = ({
  stepsFromCommands: {
    maxArgumentLength = DEFAULT_RUNTIME_CONFIG.stepsFromCommands.maxArgumentLength,
    maxArgumentDepth = DEFAULT_RUNTIME_CONFIG.stepsFromCommands.maxArgumentDepth,
  } = DEFAULT_RUNTIME_CONFIG.stepsFromCommands,
}: AllureCypressConfig = DEFAULT_RUNTIME_CONFIG): AllureSpecState["config"] => ({
  stepsFromCommands: {
    maxArgumentDepth,
    maxArgumentLength,
  },
});

const initializeRuntimeState = (cypressConfig: Cypress.PluginConfigOptions, allureConfig?: AllureCypressConfig) => {
  cypressConfig.env.allure = createRuntimeState(allureConfig);
  return cypressConfig;
};

/**
 * Sets up Allure Cypress.
 * @param on The function used to subscribe to Cypress Node events (it's the first argument of `setupNodeEvents`).
 * @param cypressConfig The Cypress configuration (the second argument of `setupNodeEvents`). If provided, the selective run feature will be enabled.
 * @param allureConfig An Allure configuration object (optional).
 * @example
 * ```javascript
 * import { defineConfig } from "cypress";
 * import { allureCypress } from "allure-cypress/reporter";
 *
 * export default defineConfig({
 *   e2e: {
 *     setupNodeEvents: (on, config) => {
 *       allureCypress(on, config, { videoOnFailOnly: true });
 *       return config;
 *     },
 *     // ...
 *   }
 * });
 * ```
 */
export const allureCypress = (
  on: Cypress.PluginEvents,
  cypressConfig?: Cypress.PluginConfigOptions,
  allureConfig?: AllureCypressConfig,
) => {
  // Backward compatibility; mainly for JS users who have no type hints
  if (!allureConfig && cypressConfig && !("env" in cypressConfig)) {
    allureConfig = cypressConfig as AllureCypressConfig;
  }

  const hasCypressConfig = cypressConfig && "env" in cypressConfig;

  const allureCypressReporter = new AllureCypress(allureConfig);
  allureCypressReporter.attachToCypress(on);

  if (hasCypressConfig) {
    initializeRuntimeState(cypressConfig, allureConfig);
  }

  return allureCypressReporter;
};
