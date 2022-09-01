import os from "os";
import process from "process";
import { Formatter } from "@cucumber/cucumber";
import { IFormatterOptions } from "@cucumber/cucumber/lib/formatter";
import TestCaseHookDefinition from "@cucumber/cucumber/lib/models/test_case_hook_definition";
import * as messages from "@cucumber/messages";
import { Tag, TestStepResultStatus } from "@cucumber/messages";
import {
  Allure,
  ALLURE_METADATA_CONTENT_TYPE,
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItem,
  ExecutableItemWrapper,
  Label,
  LabelName,
  Link,
  Stage,
  Status,
} from "allure-js-commons";
import { CucumberAllureInterface } from "./CucumberAllureInterface";
import { CucumberAttachmentMetadata, CucumberAttachmentStepMetadata } from "./CucumberAllureWorld";

export { Allure };

export type LabelMatcher = {
  pattern: RegExp[];
  name: "epic" | "severity" | string;
};

export type LinkMatcher = {
  pattern: RegExp[];
  urlTemplate: string;
  type: "tms" | "issue" | string;
};

export class CucumberJSAllureFormatterConfig {
  exceptionFormatter?: (message: string) => string;
  labels?: LabelMatcher[];
  links?: LinkMatcher[];
}

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;

export class CucumberJSAllureFormatter extends Formatter {
  public readonly allureInterface: Allure;
  currentAfter: ExecutableItemWrapper | null = null;
  currentBefore: ExecutableItemWrapper | null = null;
  currentGroup: AllureGroup | null = null;
  currentTest: AllureTest | null = null;
  private readonly afterHooks: TestCaseHookDefinition[];
  private readonly beforeHooks: TestCaseHookDefinition[];
  private readonly exceptionFormatter: (message: string) => string;
  private readonly labelsMathers: LabelMatcher[];
  private readonly linksMatchers: LinkMatcher[];
  private stepStack: AllureStep[] = [];
  private hostname: string = ALLURE_HOST_NAME || os.hostname();
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
  private runningTestsMap: Map<string, AllureTest> = new Map();

  constructor(
    options: IFormatterOptions,
    private readonly allureRuntime: AllureRuntime,
    config: CucumberJSAllureFormatterConfig,
  ) {
    super(options);
    options.eventBroadcaster.on("envelope", this.parseEnvelope.bind(this));

    this.labelsMathers = config.labels || [];
    this.linksMatchers = config.links || [];

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
    this.beforeHooks = options.supportCodeLibrary.beforeTestCaseHookDefinitions;
    this.afterHooks = options.supportCodeLibrary.afterTestCaseHookDefinitions;
  }

  private get tagsIgnorePatterns(): RegExp[] {
    const { linksMatchers, labelsMathers } = this;

    return [...linksMatchers, ...labelsMathers].flatMap(({ pattern }) => pattern);
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

  private parseTagsLabels(tags: readonly Tag[]): Label[] {
    const labels: Label[] = [];

    if (this.labelsMathers.length === 0) {
      return labels;
    }

    this.labelsMathers.forEach((matcher) => {
      const matchedTags = tags.filter((tag) =>
        matcher.pattern.some((pattern) => pattern.test(tag.name)),
      );
      const matchedLabels = matchedTags.map((tag) => {
        const tagValue = tag.name.replace(/^@\S+:/, "");

        return {
          name: matcher.name,
          value: tagValue,
        };
      });

      labels.push(...matchedLabels);
    });

    return labels;
  }

  private parseTagsLinks(tags: readonly Tag[]): Link[] {
    const tagKeyRe = /^@\S+=/;
    const links: Link[] = [];

    if (this.linksMatchers.length === 0) {
      return links;
    }

    this.linksMatchers.forEach((matcher) => {
      const matchedTags = tags.filter((tag) =>
        matcher.pattern.some((pattern) => pattern.test(tag.name)),
      );
      const matchedLinks = matchedTags.map((tag) => {
        const tagValue = tag.name.replace(tagKeyRe, "");

        return {
          url: matcher.urlTemplate.replace(/%s$/, tagValue) || tagValue,
          type: matcher.type,
        };
      });

      links.push(...matchedLinks);
    });

    return links;
  }

  private onGherkinDocument(data: messages.GherkinDocument): void {
    if (data.uri) {
      this.documentMap.set(data.uri, data);
    }
    data.feature?.children?.forEach((fc) => {
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

    const doc = this.documentMap.get(pickle.uri);
    const scenarioId = pickle?.astNodeIds?.[0];
    const scenario = this.scenarioMap.get(scenarioId);
    const labels = this.parseTagsLabels(scenario?.tags || []);
    const links = this.parseTagsLinks(scenario?.tags || []);
    const currentTest = new AllureTest(this.allureRuntime, Date.now());
    const thread = ALLURE_THREAD_NAME || process.pid.toString();

    this.runningTestsMap.set(data.id, currentTest);
    this.testCaseStartedMap.set(data.id, data);
    this.testCaseTestStepsResults.set(data.id, []);

    currentTest.name = pickle.name;
    currentTest?.addLabel(LabelName.HOST, this.hostname);
    currentTest?.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest?.addLabel(LabelName.FRAMEWORK, "cucumberjs");
    currentTest?.addLabel(LabelName.THREAD, thread);

    if (doc?.feature) {
      currentTest.addLabel(LabelName.FEATURE, doc.feature.name);
    }

    if (scenario) {
      currentTest?.addLabel(LabelName.SUITE, scenario.name);
    }

    if (labels.length > 0) {
      labels.forEach((label) => currentTest?.addLabel(label.name, label.value));
    }

    if (pickle.tags?.length) {
      const filteredTags = pickle.tags.filter(
        (tag) => !this.tagsIgnorePatterns.some((pattern) => pattern.test(tag.name)),
      );

      filteredTags.forEach((tag) => {
        currentTest?.addLabel(LabelName.TAG, tag.name);
      });
    }

    links.forEach((link) => currentTest?.addLink(link.url, link.name, link.type));

    // writting data tables as csv attachments
    pickle.steps.forEach((ps) => {
      const { argument } = ps;

      if (!currentTest || !argument?.dataTable) {
        return;
      }

      const csvDataTable = argument.dataTable.rows.reduce(
        (acc, row) => `${acc + row.cells.map((cell) => cell.value).join(",")}\n`,
        "",
      );
      const attachmentFilename = this.allureRuntime.writeAttachment(csvDataTable, "text/csv");

      currentTest.addAttachment(
        "Data table",
        {
          contentType: "text/csv",
        },
        attachmentFilename,
      );
    });

    if (!scenario) {
      return;
    }

    if (scenario.examples.length === 0) {
      return;
    }

    // writting scenario examples as csv attachments
    scenario.examples.forEach((example) => {
      if (!currentTest) {
        return;
      }

      const csvDataTableHeader =
        example?.tableHeader?.cells.map((cell) => cell.value).join(",") || "";
      const csvDataTableBody =
        example?.tableBody.map((row) => row.cells.map((cell) => cell.value).join(",")).join("\n") ||
        "";

      if (!csvDataTableHeader && !csvDataTableBody) {
        return;
      }

      const csvDataTable = `${csvDataTableHeader}\n${csvDataTableBody}\n`;
      const attachmentFilename = this.allureRuntime.writeAttachment(csvDataTable, "text/csv");

      currentTest.addAttachment(
        "Examples",
        {
          contentType: "text/csv",
        },
        attachmentFilename,
      );
    });
  }

  private onAttachment(data: messages.Attachment): void {
    const currentTest = this.runningTestsMap.get(data?.testCaseStartedId || "");

    if (!currentTest) {
      return;
    }

    const currentStep = this.allureSteps.get(data?.testStepId || "");

    if (!data) {
      // eslint-disable-next-line no-console
      console.error("onAttachment", "attachment can't be empty");
      return;
    }

    const { fileName = "attachment", body, mediaType, contentEncoding } = data;

    if (mediaType === ALLURE_METADATA_CONTENT_TYPE) {
      this.handleAllureAttachment({
        test: currentTest,
        step: currentStep,
        metadata: JSON.parse(body) as CucumberAttachmentMetadata,
      });
      return;
    }

    const encoding = Buffer.isEncoding(contentEncoding) ? contentEncoding : undefined; // only pass through valid encodings
    const attachmentFilename = this.allureRuntime.writeAttachment(body, mediaType, encoding);

    currentTest.addAttachment(
      fileName,
      {
        contentType: mediaType,
      },
      attachmentFilename,
    );
  }

  private handleAllureAttachment(payload: {
    test: AllureTest;
    step?: AllureStep;
    metadata: CucumberAttachmentMetadata;
  }) {
    const { labels = [], links = [], step } = payload.metadata;

    if (links.length > 0) {
      links.forEach((link) => payload.test.addLink(link.url, link.type, link.name));
    }

    if (labels.length > 0) {
      labels.forEach((label) => payload.test.addLabel(label.name, label.value));
    }

    if (step) {
      this.handleAllureStep({
        test: payload.test,
        step: payload.step,
        metadata: step,
      });
    }
  }

  private handleAllureStep(payload: {
    test: AllureTest;
    step?: AllureStep;
    metadata: CucumberAttachmentStepMetadata;
  }) {
    const testStep: ExecutableItem = {
      ...payload.metadata,
      steps: [],
      parameters: [],
    };

    if (payload.step) {
      payload.step.addStep({
        ...payload.metadata,
        steps: [],
        parameters: [],
      });
      return;
    }

    payload.test.addStep(testStep);
  }

  private onTestCaseFinished(data: messages.TestCaseFinished): void {
    const currentTest = this.runningTestsMap.get(data.testCaseStartedId);

    if (!currentTest) {
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
      currentTest.status = this.convertStatus(worstTestStepResult.status);
      currentTest.statusDetails = {
        message: worstTestStepResult.message,
      };
    } else {
      currentTest.status = Status.PASSED;
    }

    currentTest.endTest(Date.now());
    this.runningTestsMap.delete(data.testCaseStartedId);
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
    const currentTest = this.runningTestsMap.get(data.testCaseStartedId);

    if (!currentTest) {
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
      const allureStep = currentTest.startStep(keyword + ps.text, Date.now());
      this.allureSteps.set(data.testStepId, allureStep);
    }
  }

  private onTestStepFinished(data: messages.TestStepFinished) {
    const currentTest = this.runningTestsMap.get(data.testCaseStartedId);

    this.testCaseTestStepsResults.get(data.testCaseStartedId)?.push(data.testStepResult);

    if (!currentTest) {
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
