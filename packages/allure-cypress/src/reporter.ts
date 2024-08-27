import type Cypress from "cypress";
import path from "node:path";
import { ContentType, Stage, Status } from "allure-js-commons";
import type { TestResult } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getSuiteLabels,
  getThreadLabel,
  parseTestPlan,
} from "allure-js-commons/sdk/reporter";
import type {
  AllureCypressConfig,
  AllureCypressTaskArgs,
  AllureSpecState,
  CypressCommandEndMessage,
  CypressCommandStartMessage,
  CypressFailMessage,
  CypressHookEndMessage,
  CypressHookStartMessage,
  CypressSkippedTestMessage,
  CypressSuiteEndMessage,
  CypressSuiteStartMessage,
  CypressTestEndMessage,
  CypressTestSkipMessage,
  CypressTestStartMessage,
  SpecContext,
} from "./model.js";
import { getHookType, last } from "./utils.js";

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
        this.endSpec(args.absolutePath);
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
   * @param results The second argument of the `after:spec` event.
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
  onAfterSpec = (spec: Cypress.Spec, results: CypressCommandLine.RunResult) => {
    this.endSpec(spec.absolute, results.video ?? undefined);
  };

  /**
   * Forward the `after:run` event into Allure Cypress using this function if
   * you need to define your own handler or combine Allure Cypress with other
   * plugins. More info [here](https://github.com/allure-framework/allure-js/blob/main/packages/allure-cypress/README.md#setupnodeevents-limitations).
   * @param results The argument of the `after:run` event.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAfterRun = (results: CypressCommandLine.CypressFailedRunResult | CypressCommandLine.CypressRunResult) => {
    this.endRun();
  };

  endRun = () => {
    this.#endAllSpecs();
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
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
        case "cypress_command_start":
          this.#startCommand(context, message);
          break;
        case "cypress_command_end":
          this.#stopCommand(context, message);
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

  #startSuite = (context: SpecContext, { data: { name, root } }: CypressSuiteStartMessage) => {
    const scope = this.allureRuntime.startScope();
    context.suiteScopes.push(scope);
    if (!root) {
      this.#emitPreviousTestScope(context);
      context.suiteNames.push(name);
    }
  };

  #stopSuite = (context: SpecContext, { data: { root } }: CypressSuiteEndMessage) => {
    this.#emitPreviousTestScope(context);
    if (!root) {
      context.suiteNames.pop();
    }
    const scope = context.suiteScopes.pop();
    if (scope) {
      this.allureRuntime.writeScope(scope);
    }
  };

  #startHook = (context: SpecContext, { data: { name, start } }: CypressHookStartMessage) => {
    const [hookPosition, hookScopeType] = getHookType(name);
    if (hookPosition) {
      const isEach = hookScopeType === "each";
      const isAfterEach = hookPosition === "after" && isEach;
      if (!isAfterEach) {
        this.#emitPreviousTestScope(context);
      }

      const scope = isEach ? context.testScope : last(context.suiteScopes);
      if (scope) {
        context.fixture = this.allureRuntime.startFixture(scope, hookPosition, {
          name,
          start,
          status: undefined,
        });
      }
    }
  };

  #stopHook = (context: SpecContext, { data: { duration } }: CypressHookEndMessage) => {
    const fixtureUuid = context.fixture;
    if (fixtureUuid) {
      this.allureRuntime.updateFixture(fixtureUuid, (fixture) => {
        fixture.status ??= Status.PASSED;
      });
      this.allureRuntime.stopFixture(fixtureUuid, { duration });
      context.fixture = undefined;
    }
  };

  #startTest = (context: SpecContext, { data }: CypressTestStartMessage) => {
    this.#emitPreviousTestScope(context);
    const testScope = this.allureRuntime.startScope();
    context.testScope = testScope;
    context.test = this.#addNewTestResult(context, data, testScope);
  };

  #addNewTestResult = (
    context: SpecContext,
    { labels: metadataLabels = [], ...data }: Partial<TestResult>,
    testScope?: string,
  ) =>
    this.allureRuntime.startTest(
      {
        ...data,
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
      },
      [context.videoScope, ...context.suiteScopes].concat(testScope ? [testScope] : []),
    );

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

  #addSkippedTest = (context: SpecContext, { data }: CypressSkippedTestMessage) => {
    const testUuid = this.#addNewTestResult(context, data);
    this.#stopExistingTestResult(testUuid, data);
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
  };

  #startCommand = (context: SpecContext, { data: { name, args } }: CypressCommandStartMessage) => {
    const rootUuid = this.#resolveRootUuid(context);
    if (rootUuid) {
      const stepUuid = this.allureRuntime.startStep(rootUuid, undefined, {
        name,
        parameters: args.map((arg, j) => ({
          name: `Argument [${j}]`,
          value: arg,
        })),
      });
      if (stepUuid) {
        context.commandSteps.push(stepUuid);
      }
    }
  };

  #stopCommand = (context: SpecContext, { data: { status, statusDetails, stop } }: CypressCommandEndMessage) => {
    const stepUuid = context.commandSteps.pop();
    if (stepUuid) {
      this.allureRuntime.updateStep(stepUuid, (r) => {
        r.status = status;

        if (statusDetails) {
          r.statusDetails = statusDetails;
        }
      });
      this.allureRuntime.stopStep(stepUuid, { stop });
    }
  };

  #applyRuntimeApiMessages = (context: SpecContext, message: RuntimeMessage) => {
    const rootUuid = this.#resolveRootUuid(context);
    if (rootUuid) {
      this.allureRuntime.applyRuntimeMessages(rootUuid, [message]);
    }
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
    const specPathElements = path.relative(process.cwd(), absolutePath).split(path.sep);
    const context = {
      specPath: specPathElements.join("/"),
      package: specPathElements.join("."),
      test: undefined,
      fixture: undefined,
      commandSteps: [],
      videoScope: this.allureRuntime.startScope(),
      suiteScopes: [],
      testScope: undefined,
      suiteNames: [],
      failed: false,
    };
    this.specContextByAbsolutePath.set(absolutePath, context);
  };
}

const getInitialSpecState = (): AllureSpecState => ({
  initialized: false,
  messages: [],
  testPlan: parseTestPlan(),
});

/**
 * Explicitly enables the selective run feature.
 * @param config The Cypress configuration.
 */
export const enableTestPlan = (config: Cypress.PluginConfigOptions) => {
  config.env.allure = getInitialSpecState();
  return config;
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

  const allureCypressReporter = new AllureCypress(allureConfig);
  allureCypressReporter.attachToCypress(on);

  if (cypressConfig && "env" in cypressConfig) {
    enableTestPlan(cypressConfig);
  }

  return allureCypressReporter;
};
