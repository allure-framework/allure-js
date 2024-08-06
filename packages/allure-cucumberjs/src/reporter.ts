import type { IFormatterOptions, TestCaseHookDefinition } from "@cucumber/cucumber";
import { Formatter, World } from "@cucumber/cucumber";
import type * as messages from "@cucumber/messages";
import {
  AttachmentContentEncoding,
  type PickleTag,
  type Tag,
  type TestStepResult,
  TestStepResultStatus,
} from "@cucumber/messages";
import { extname } from "node:path";
import process from "node:process";
import type { Label, Link, TestResult } from "allure-js-commons";
import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { getMessageAndTraceFromError } from "allure-js-commons/sdk";
import {
  ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
  ReporterRuntime,
  applyLinkTemplate,
  createDefaultWriter,
  createStepResult,
  getEnvironmentLabels,
  getHostLabel,
  getPackageLabelFromPath,
  getWorstStepResultStatus,
  md5,
} from "allure-js-commons/sdk/reporter";
import { AllureCucumberWorld } from "./legacy.js";
import type { AllureCucumberLinkConfig, AllureCucumberReporterConfig, LabelConfig } from "./model.js";

const { ALLURE_THREAD_NAME } = process.env;

export default class AllureCucumberReporter extends Formatter {
  private readonly afterHooks: Record<string, TestCaseHookDefinition> = {};
  private readonly beforeHooks: Record<string, TestCaseHookDefinition> = {};

  private linksConfigs: AllureCucumberLinkConfig = {};
  private labelsConfigs: LabelConfig[] = [];
  private allureRuntime: ReporterRuntime;

  private readonly documentMap: Map<string, messages.GherkinDocument> = new Map();
  private readonly scenarioMap: Map<string, messages.Scenario> = new Map();
  private readonly stepMap: Map<string, messages.Step> = new Map();
  private readonly testStepMap: Map<string, messages.TestStep> = new Map();
  private readonly pickleStepMap: Map<string, messages.PickleStep> = new Map();
  private readonly pickleMap: Map<string, messages.Pickle> = new Map();
  private readonly testCaseMap: Map<string, messages.TestCase> = new Map();
  private readonly testCaseStartedMap: Map<string, messages.TestCaseStarted> = new Map();
  private readonly testResultUuids: Map<string, string> = new Map();
  private readonly scopeUuids: Map<string, string> = new Map();
  private readonly fixtureUuids: Map<string, string> = new Map();

  constructor(options: IFormatterOptions) {
    super(options);

    const { resultsDir, links, labels, ...rest } = options.parsedArgvOptions as AllureCucumberReporterConfig;

    this.allureRuntime = new ReporterRuntime({
      writer: createDefaultWriter({ resultsDir }),
      links,
      ...rest,
    });
    this.linksConfigs = links || {};
    this.labelsConfigs = labels || [];

    options.eventBroadcaster.on("envelope", this.parseEnvelope.bind(this));

    this.beforeHooks = options.supportCodeLibrary.beforeTestCaseHookDefinitions.reduce(
      (acc, hook) => Object.assign(acc, { [hook.id]: hook }),
      {},
    );
    this.afterHooks = options.supportCodeLibrary.afterTestCaseHookDefinitions.reduce(
      (acc, hook) => Object.assign(acc, { [hook.id]: hook }),
      {},
    );
    // set AllureCucumberWorld for single thread mode
    if (options.supportCodeLibrary.World === World) {
      // @ts-ignore
      // noinspection JSConstantReassignment
      options.supportCodeLibrary.World = AllureCucumberWorld;
    }
  }

  private get tagsIgnorePatterns(): RegExp[] {
    const { labelsConfigs, linksConfigs } = this;
    const linkConfigEntries = Object.entries(linksConfigs).map(([, v]) => v);
    return [...labelsConfigs, ...linkConfigEntries].flatMap(({ pattern }) => pattern);
  }

  private parseEnvelope(envelope: messages.Envelope) {
    switch (true) {
      case !!envelope.gherkinDocument:
        this.onGherkinDocument(envelope.gherkinDocument);
        break;
      case !!envelope.pickle:
        this.onPickle(envelope.pickle);
        break;
      case !!envelope.testCase:
        this.onTestCase(envelope.testCase);
        break;
      case !!envelope.testCaseStarted:
        this.onTestCaseStarted(envelope.testCaseStarted);
        break;
      case !!envelope.testCaseFinished:
        this.onTestCaseFinished(envelope.testCaseFinished);
        break;
      case !!envelope.attachment:
        this.onAttachment(envelope.attachment);
        break;
      case !!envelope.testStepStarted:
        this.onTestStepStarted(envelope.testStepStarted);
        break;
      case !!envelope.testStepFinished:
        this.onTestStepFinished(envelope.testStepFinished);
        break;
      case !!envelope.testRunFinished:
        this.onTestRunFinished();
        break;
    }
  }

  private parseTagsLabels(tags: readonly Tag[]): Label[] {
    const labels: Label[] = [];

    if (this.labelsConfigs.length === 0) {
      return labels;
    }

    this.labelsConfigs.forEach((matcher) => {
      const matchedTags = tags.filter((tag) => matcher.pattern.some((pattern) => pattern.test(tag.name)));
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

  private parsePickleTags(tags: readonly PickleTag[]): Label[] {
    return tags
      .filter((tag) => !this.tagsIgnorePatterns.some((pattern) => pattern.test(tag.name)))
      .map((tag) => ({
        name: LabelName.TAG,
        value: tag.name,
      }));
  }

  private parseTagsLinks(tags: readonly Tag[]): Link[] {
    const tagKeyRe = /^@\S+=/;
    const links: Link[] = [];

    if (Object.keys(this.linksConfigs).length === 0) {
      return links;
    }

    Object.entries(this.linksConfigs).forEach(([type, matcher]) => {
      const matchedTags = tags.filter((tag) => matcher.pattern.some((pattern) => pattern.test(tag.name)));
      const matchedLinks = matchedTags.map((tag) => {
        const tagValue = tag.name.replace(tagKeyRe, "");

        return {
          url: applyLinkTemplate(matcher.urlTemplate, tagValue) || tagValue,
          type,
        };
      });

      links.push(...matchedLinks);
    });

    return links;
  }

  private parseStatus(stepResult: TestStepResult): Status | undefined {
    const containsAssertionError = /assertion/i.test(stepResult?.exception?.type || "");

    switch (stepResult.status) {
      case TestStepResultStatus.FAILED:
        return containsAssertionError ? Status.FAILED : Status.BROKEN;
      case TestStepResultStatus.PASSED:
        return Status.PASSED;
      case TestStepResultStatus.SKIPPED:
      case TestStepResultStatus.PENDING:
        return Status.SKIPPED;
      default:
        return undefined;
    }
  }

  private onRule(data: messages.Rule): void {
    data.children?.forEach((c) => {
      if (c.scenario) {
        this.onScenario(c.scenario);
      }
    });
  }

  private onGherkinDocument(data: messages.GherkinDocument): void {
    if (data.uri) {
      this.documentMap.set(data.uri, data);
    }

    data.feature?.children?.forEach((c) => {
      if (c.rule) {
        this.onRule(c.rule);
      } else if (c.scenario) {
        this.onScenario(c.scenario);
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

  private onTestCaseStarted(data: messages.TestCaseStarted) {
    const testCase = this.testCaseMap.get(data.testCaseId)!;
    const pickle = this.pickleMap.get(testCase.pickleId)!;
    const doc = this.documentMap.get(pickle.uri)!;
    const [scenarioId] = pickle.astNodeIds;
    const scenario = this.scenarioMap.get(scenarioId);
    const fullName = `${pickle.uri}#${pickle.name}`;
    const result: Partial<TestResult> = {
      name: pickle.name,
      description: (scenario?.description || doc?.feature?.description || "").trim(),
      labels: [],
      links: [],
      testCaseId: md5(fullName),
      start: data.timestamp.nanos / 1000,
      fullName,
    };

    const hostLabel = getHostLabel();
    const packageLabel = getPackageLabelFromPath(fullName);

    result.labels!.push(...getEnvironmentLabels());
    result.labels!.push(
      {
        name: LabelName.LANGUAGE,
        value: "javascript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "cucumberjs",
      },
      packageLabel,
      hostLabel,
      {
        name: LabelName.THREAD,
        value: data.workerId || ALLURE_THREAD_NAME || process.pid.toString(),
      },
    );

    if (doc?.feature) {
      result.labels!.push({
        name: LabelName.FEATURE,
        value: doc.feature.name,
      });
    }

    const pickleLabels = this.parsePickleTags(pickle.tags || []);
    const featureLabels = this.parseTagsLabels(doc?.feature?.tags || []);
    const featureLinks = this.parseTagsLinks(doc?.feature?.tags || []);
    const scenarioLabels = this.parseTagsLabels(scenario?.tags || []);
    const scenarioLinks = this.parseTagsLinks(scenario?.tags || []);

    result.labels!.push(...featureLabels, ...scenarioLabels, ...pickleLabels);
    result.links!.push(...featureLinks, ...scenarioLinks);

    const scopeUuid = this.allureRuntime.startScope();
    this.scopeUuids.set(data.id, scopeUuid);

    const testUuid = this.allureRuntime.startTest(result, [scopeUuid]);
    this.testResultUuids.set(data.id, testUuid);

    this.testCaseStartedMap.set(data.id, data);

    if (!scenario?.examples) {
      return;
    }

    scenario.examples.forEach((example) => {
      const csvDataTableHeader = example?.tableHeader?.cells.map((cell) => cell.value).join(",") || "";
      const csvDataTableBody =
        example?.tableBody.map((row) => row.cells.map((cell) => cell.value).join(",")).join("\n") || "";

      if (!csvDataTableHeader && !csvDataTableBody) {
        return;
      }

      const csvDataTable = `${csvDataTableHeader}\n${csvDataTableBody}\n`;

      this.allureRuntime.writeAttachment(testUuid, null, "Examples", Buffer.from(csvDataTable, "utf-8"), {
        contentType: ContentType.CSV,
        fileExtension: ".csv",
      });
    });
  }

  private onTestCaseFinished(data: messages.TestCaseFinished) {
    const testUuid = this.testResultUuids.get(data.testCaseStartedId);
    if (!testUuid) {
      return;
    }

    this.allureRuntime.updateTest(testUuid, (result) => {
      result.status = result.steps.length > 0 ? getWorstStepResultStatus(result.steps) : Status.PASSED;
      result.stage = Stage.FINISHED;

      if (result.status === undefined) {
        result.statusDetails = {
          message: "The test doesn't have an implementation.",
        };
      }
    });
    this.allureRuntime.stopTest(testUuid, { stop: data.timestamp.nanos / 1000 });
    this.allureRuntime.writeTest(testUuid);
    this.testResultUuids.delete(data.testCaseStartedId);

    const scopeUuid = this.scopeUuids.get(data.testCaseStartedId);
    if (scopeUuid) {
      this.allureRuntime.writeScope(scopeUuid);
      this.scopeUuids.delete(data.testCaseStartedId);
    }
  }

  private onTestStepStarted(data: messages.TestStepStarted) {
    const testUuid = this.testResultUuids.get(data.testCaseStartedId)!;
    const step = this.testStepMap.get(data.testStepId)!;
    if (step.hookId) {
      const scopeUuid = this.scopeUuids.get(data.testCaseStartedId);
      if (!scopeUuid) {
        return;
      }

      const beforeHook = step.hookId && this.beforeHooks[step.hookId];
      const afterHook = step.hookId && this.afterHooks[step.hookId];

      const type = beforeHook ? "before" : afterHook ? "after" : undefined;
      if (!type) {
        return;
      }
      const name = beforeHook ? beforeHook.name : afterHook ? afterHook.name : "hook";
      if (name === "ALLURE_FIXTURE_IGNORE") {
        return;
      }

      const fixtureUuid = this.allureRuntime.startFixture(scopeUuid, type, {
        name,
        stage: Stage.RUNNING,
        start: data.timestamp.nanos / 1000,
      });
      if (fixtureUuid) {
        this.fixtureUuids.set(data.testCaseStartedId, fixtureUuid);
      }
      return;
    }

    if (!step.pickleStepId) {
      return;
    }

    const stepPickle = this.pickleStepMap.get(step.pickleStepId)!;

    if (!stepPickle) {
      return;
    }

    const stepKeyword =
      stepPickle.astNodeIds
        .map((astNodeId) => this.stepMap.get(astNodeId))
        .map((stepAstNode) => stepAstNode?.keyword)
        .find((keyword) => keyword !== undefined) || "";

    const stepUuid = this.allureRuntime.startStep(testUuid, undefined, {
      ...createStepResult(),
      name: `${stepKeyword}${stepPickle.text}`,
      start: data.timestamp.nanos / 1000,
    });

    if (!stepPickle.argument?.dataTable) {
      return;
    }

    const csvDataTable = stepPickle.argument.dataTable.rows.reduce(
      (acc, row) => `${acc + row.cells.map((cell) => cell.value).join(",")}\n`,
      "",
    );

    this.allureRuntime.writeAttachment(testUuid, stepUuid, "Data table", Buffer.from(csvDataTable, "utf-8"), {
      contentType: ContentType.CSV,
      fileExtension: ".csv",
    });
  }

  private onTestStepFinished(data: messages.TestStepFinished) {
    const step = this.testStepMap.get(data.testStepId);
    if (!step) {
      return;
    }

    const status = this.parseStatus(data.testStepResult);
    const stage = status !== Status.SKIPPED ? Stage.FINISHED : Stage.PENDING;

    if (step.hookId) {
      const fixtureUuid = this.fixtureUuids.get(data.testCaseStartedId);
      if (!fixtureUuid) {
        return;
      }

      this.allureRuntime.updateFixture(fixtureUuid, (r) => {
        r.stage = stage;
        r.status = status;

        if (data.testStepResult.exception) {
          r.statusDetails = getMessageAndTraceFromError({
            message: data.testStepResult.message,
            stack: data.testStepResult.exception.stackTrace,
          });
        }
      });
      this.allureRuntime.stopFixture(fixtureUuid, { stop: data.timestamp.nanos / 1000 });
      this.fixtureUuids.delete(data.testCaseStartedId);
      return;
    }

    const testUuid = this.testResultUuids.get(data.testCaseStartedId)!;
    const currentStep = this.allureRuntime.currentStep(testUuid);

    if (!currentStep) {
      return;
    }

    this.allureRuntime.updateStep(currentStep, (r) => {
      r.status = status;
      r.stage = stage;

      if (status === undefined) {
        r.statusDetails = {
          message: "The step doesn't have an implementation.",
        };
        return;
      }

      if (data.testStepResult.exception) {
        r.statusDetails = {
          message: data.testStepResult.message,
          trace: data.testStepResult.exception.stackTrace,
        };
      }
    });

    this.allureRuntime.stopStep(currentStep, { stop: data.timestamp.nanos / 1000 });
  }

  private onAttachment(message: messages.Attachment): void {
    if (!message.testCaseStartedId) {
      return;
    }

    const fixtureUuid = this.fixtureUuids.get(message.testCaseStartedId);
    const testUuid = this.testResultUuids.get(message.testCaseStartedId);
    const rootUuid = fixtureUuid ?? testUuid;
    if (!rootUuid) {
      return;
    }

    if (message.mediaType === "application/vnd.allure.skipcucumber+json") {
      if (testUuid) {
        this.allureRuntime.updateTest(testUuid, (result) => {
          result.labels.push({ name: "ALLURE_TESTPLAN_SKIP", value: "true" });
        });
      }
      return;
    }

    if (message.mediaType === ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE) {
      const parsedMessage = JSON.parse(message.body);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.allureRuntime.applyRuntimeMessages(rootUuid, Array.isArray(parsedMessage) ? parsedMessage : [parsedMessage]);
      return;
    }

    const encoding: BufferEncoding = message.contentEncoding === AttachmentContentEncoding.BASE64 ? "base64" : "utf-8";

    this.allureRuntime.applyRuntimeMessages(rootUuid, [
      {
        type: "attachment_content",
        data: {
          name: message.fileName ?? "Attachment",
          content: Buffer.from(message.body, encoding).toString("base64"),
          encoding: "base64",
          contentType: message.mediaType,
          fileExtension: message.fileName ? extname(message.fileName) : undefined,
          wrapInStep: true,
        },
      },
    ]);
  }

  private onTestRunFinished() {
    this.allureRuntime.writeCategoriesDefinitions();
    this.allureRuntime.writeEnvironmentInfo();
  }
}
