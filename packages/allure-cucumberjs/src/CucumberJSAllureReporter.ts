import { World as CucumberWorld, Formatter } from "@cucumber/cucumber";
import { IFormatterOptions } from "@cucumber/cucumber/lib/formatter";
import TestCaseHookDefinition from "@cucumber/cucumber/lib/models/test_case_hook_definition";
import * as messages from "@cucumber/messages";
import { TestStepResultStatus } from "@cucumber/messages";
import {
  Allure,
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItemWrapper,
  Status,
} from "allure-js-commons";
import { CucumberAllureInterface } from "./CucumberAllureInterface";

export { Allure } from "allure-js-commons";

export interface World extends CucumberWorld {
  allure: Allure;
}

export class CucumberJSAllureFormatterConfig {
  exceptionFormatter?: (message: string) => string;
  labels?: { [key: string]: RegExp[] };
  links?: {
    issue?: {
      pattern: RegExp[];
      urlTemplate: string;
    };
    tms?: {
      pattern: RegExp[];
      urlTemplate: string;
    };
  };
}

export class CucumberJSAllureFormatter extends Formatter {
  public readonly allureInterface: Allure;
  currentAfter: ExecutableItemWrapper | null = null;
  currentBefore: ExecutableItemWrapper | null = null;
  currentGroup: AllureGroup | null = null;
  currentTest: AllureTest | null = null;
  private readonly afterHooks: TestCaseHookDefinition[];
  private readonly beforeHooks: TestCaseHookDefinition[];
  private readonly exceptionFormatter: (message: string) => string;
  private readonly labels: { [key: string]: RegExp[] };
  private readonly links: {
    issue?: {
      pattern: RegExp[];
      urlTemplate: string;
    };
    tms?: {
      pattern: RegExp[];
      urlTemplate: string;
    };
  };
  private stepStack: AllureStep[] = [];
  private readonly documentMap: Map<string, messages.GherkinDocument> = new Map();
  private readonly featureMap: Map<string, messages.Feature> = new Map();
  private readonly scenarioMap: Map<string, messages.Scenario> = new Map();
  private readonly stepMap: Map<string, messages.Step> = new Map();
  private readonly testStepMap: Map<string, messages.TestStep> = new Map();
  private readonly pickleStepMap: Map<string, messages.PickleStep> = new Map();
  private readonly stepDefinitionMap: Map<string, messages.StepDefinition> = new Map();
  private readonly testCaseTestStepsResults: Map<string, messages.TestStepResult[]> = new Map();
  private readonly pickleMap: Map<string, messages.Pickle> = new Map();
  private readonly hookMap: Map<string, messages.Hook> = new Map();
  private readonly sourceMap: Map<string, messages.Source> = new Map();
  private readonly testCaseMap: Map<string, messages.TestCase> = new Map();
  private readonly testCaseStartedMap: Map<string, messages.TestCaseStarted> = new Map();
  private readonly allureSteps: Map<string, AllureStep> = new Map();

  constructor(
    options: IFormatterOptions,
    private readonly allureRuntime: AllureRuntime,
    config: CucumberJSAllureFormatterConfig,
  ) {
    super(options);
    options.eventBroadcaster.on("envelope", this.parseEnvelope.bind(this));

    this.labels = config.labels || {};
    this.links = config.links || {};
    this.exceptionFormatter = (message): string => {
      if (config.exceptionFormatter !== undefined) {
        try {
          return config.exceptionFormatter(message);
        } catch (e) {
          // eslint-disable-next-line no-console,@typescript-eslint/restrict-template-expressions
          console.warn(`Error in exceptionFormatter: ${e}`);
        }
      }
      return message;
    };

    this.allureInterface = new CucumberAllureInterface(this, this.allureRuntime);
    options.supportCodeLibrary.World.prototype.allure = this.allureInterface;
    this.beforeHooks = options.supportCodeLibrary.beforeTestCaseHookDefinitions;
    this.afterHooks = options.supportCodeLibrary.afterTestCaseHookDefinitions;
  }

  private parseEnvelope(envelope: messages.Envelope): void {
    if (envelope.gherkinDocument) {
      this.onGherkinDocument(envelope.gherkinDocument);
    } else if (envelope.pickle) {
      this.onPickle(envelope.pickle);
    } else if (envelope.testCase) {
      this.onTestCase(envelope.testCase);
    } else if (envelope.testCaseStarted) {
      this.onTestCaseStarted(envelope.testCaseStarted);
    } else if (envelope.testCaseFinished) {
      this.onTestCaseFinished(envelope.testCaseFinished);
    } else if (envelope.attachment) {
      this.onAttachment(envelope.attachment);
    } else if (envelope.hook) {
      this.onHook(envelope.hook);
    } else if (envelope.source) {
      this.onSource(envelope.source);
    } else if (envelope.testStepStarted) {
      this.onTestStepStarted(envelope.testStepStarted);
    } else if (envelope.testStepFinished) {
      this.onTestStepFinished(envelope.testStepFinished);
    }
  }

  private onGherkinDocument(data: messages.GherkinDocument): void {
    if (data.uri) {
      this.documentMap.set(data.uri, data);
    }
    data?.feature?.children?.forEach((fc) => {
      if (fc.scenario) {
        this.onScenario(fc.scenario);
      }
    });
  }

  private onScenario(data: messages.Scenario): void {
    this.scenarioMap.set(data.id, data);
    data.steps.forEach((step) => this.stepMap.set(step.id, step));
  }

  private onPickle(data: messages.Pickle): void {
    this.pickleMap.set(data.id, data);
    data.steps.forEach((ps) => this.pickleStepMap.set(ps.id, ps));
  }

  private onTestCase(data: messages.TestCase): void {
    this.testCaseMap.set(data.id, data);
    data.testSteps.forEach((ts) => this.testStepMap.set(ts.id, ts));
  }

  private onTestCaseStarted(data: messages.TestCaseStarted): void {
    const testCase = this.testCaseMap.get(data.testCaseId);
    if (!testCase) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseStarted", "test case not found", data);
      return;
    }

    const pickle = this.pickleMap.get(testCase.pickleId);
    if (!pickle) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseStarted", "pickle not found", data);
      return;
    }

    this.testCaseStartedMap.set(data.id, data);
    this.testCaseTestStepsResults.set(data.id, []);
    this.currentTest = new AllureTest(this.allureRuntime, Date.now());
    this.currentTest.name = pickle.name;
  }

  private onAttachment(data: messages.Attachment): void {
    // eslint-disable-next-line no-console
    console.log("onAttachment", data);
  }

  private onTestCaseFinished(data: messages.TestCaseFinished): void {
    if (!this.currentTest) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseFinished", "current test not found", data);
      return;
    }
    const testCaseStarted = this.testCaseStartedMap.get(data.testCaseStartedId);
    if (!testCaseStarted) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseFinished", "testCaseStarted event not found", data);
      return;
    }
    const testCase = this.testCaseMap.get(testCaseStarted.testCaseId);
    if (!testCase) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseFinished", "testCase not found", data);
      return;
    }

    const pickle = this.pickleMap.get(testCase.pickleId);
    if (!pickle) {
      // eslint-disable-next-line no-console
      console.error("onTestCaseFinished", "pickle not found", data);
      return;
    }
    const testStepResults = this.testCaseTestStepsResults.get(testCaseStarted.id);
    if (testStepResults?.length) {
      const worstTestStepResult = messages.getWorstTestStepResult(testStepResults);
      this.currentTest.status = this.convertStatus(worstTestStepResult.status);
      this.currentTest.statusDetails = {
        message: worstTestStepResult.message,
      };
    } else {
      this.currentTest.status = Status.PASSED;
    }

    this.currentTest.endTest(Date.now());
  }

  private onHook(data: messages.Hook) {
    this.hookMap.set(data.id, data);
  }

  private onSource(data: messages.Source) {
    if (data.uri) {
      this.sourceMap.set(data.uri, data);
    }
  }

  private onTestStepStarted(data: messages.TestStepStarted) {
    if (!this.currentTest) {
      return;
    }

    const testStep = this.testStepMap.get(data.testStepId);
    if (!testStep) {
      // eslint-disable-next-line no-console
      console.error("onTestStepStarted", "can't find step", data);
      return;
    }

    if (testStep.pickleStepId) {
      const ps = this.pickleStepMap.get(testStep.pickleStepId);
      if (!ps) {
        return;
      }
      const keyword =
        ps.astNodeIds
          .map((astNodeId) => this.stepMap.get(astNodeId))
          .map((step) => step?.keyword)
          .find((kw) => kw !== undefined) || "";
      const allureStep = this.currentTest.startStep(keyword + ps.text, Date.now());
      this.allureSteps.set(data.testStepId, allureStep);
    }
  }

  private onTestStepFinished(data: messages.TestStepFinished) {
    this.testCaseTestStepsResults.get(data.testCaseStartedId)?.push(data.testStepResult);
    if (!this.currentTest) {
      return;
    }

    const allureStep = this.allureSteps.get(data.testStepId);
    if (!allureStep) {
      return;
    }

    allureStep.detailsMessage = data.testStepResult.message;
    allureStep.status = this.convertStatus(data.testStepResult.status);

    allureStep.endStep(Date.now());
  }

  private convertStatus = (status: TestStepResultStatus): Status | undefined => {
    switch (status) {
      case TestStepResultStatus.FAILED:
        return Status.FAILED;
      case TestStepResultStatus.PASSED:
        return Status.PASSED;
      case TestStepResultStatus.SKIPPED:
      case TestStepResultStatus.PENDING:
        return Status.SKIPPED;
      default:
        return undefined;
    }
  };
}
