import { Formatter, World as CucumberWorld } from "cucumber";
import {
  AllureGroup,
  Allure,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  ExecutableItemWrapper,
  GlobalInfoWriter,
  LabelName
} from "allure-js-commons";
import { Result } from "./events/Result";
import { SourceLocation } from "./events/SourceLocation";
import { GherkinStep } from "./events/GherkinStep";
import { GherkinTestCase } from "./events/GherkinTestCase";
import { GherkinDocument } from "./events/GherkinDocument";
import { examplesToSensibleFormat } from "./events/Example";
import { TestHookDefinition } from "./events/TestHookDefinition";
import { CucumberAllureInterface } from "./CucumberAllureInterface";
import {
  applyExample,
  hash,
  statusTextToAllure,
  statusTextToStage,
  stripIndent
} from "./utilities";

export { Allure } from "allure-js-commons";

export interface World extends CucumberWorld {
  allure: Allure;
}

export class CucumberJSAllureFormatterConfig {
  labels?: {
    [key: string]: RegExp[];
  };
  exceptionFormatter?: (message: string) => string;
}

export class CucumberJSAllureFormatter extends Formatter {
  private readonly sourceMap: Map<string, string[]> = new Map();
  private readonly stepsMap: Map<string, SourceLocation[]> = new Map();
  private readonly featureMap: Map<string, GherkinDocument> = new Map();
  private readonly labels: { [key: string]: RegExp[]; };
  private readonly exceptionFormatter: (message: string) => string;
  private readonly beforeHooks: TestHookDefinition[];
  private readonly afterHooks: TestHookDefinition[];

  private stepStack: AllureStep[] = [];
  currentGroup: AllureGroup | null = null;
  currentTest: AllureTest | null = null;
  currentBefore: ExecutableItemWrapper | null = null;
  currentAfter: ExecutableItemWrapper | null = null;

  public readonly allureInterface: Allure;

  constructor(options: any, private readonly allureRuntime: AllureRuntime,
    config: CucumberJSAllureFormatterConfig) {
    super(options);
    options.eventBroadcaster
      .on("source", this.onSource.bind(this))
      .on("gherkin-document", this.onGherkinDocument.bind(this))
      .on("test-case-prepared", this.onTestCasePrepared.bind(this))
      .on("test-case-started", this.onTestCaseStarted.bind(this))
      .on("test-step-started", this.onTestStepStarted.bind(this))
      .on("test-step-attachment", this.onTestStepAttachment.bind(this))
      .on("test-step-finished", this.onTestStepFinished.bind(this))
      .on("test-case-finished", this.onTestCaseFinished.bind(this));

    this.labels = config.labels || {};
    this.exceptionFormatter = function(message) {
      if (config.exceptionFormatter !== undefined) {
        try {
          return config.exceptionFormatter(message);
        } catch (e) {
          console.warn(`Error in exceptionFormatter: ${e}`);
        }
      }
      return message;
    };

    this.allureInterface = new CucumberAllureInterface(this);
    options.supportCodeLibrary.World.prototype.allure = this.allureInterface;
    this.beforeHooks = options.supportCodeLibrary.beforeTestCaseHookDefinitions;
    this.afterHooks = options.supportCodeLibrary.afterTestCaseHookDefinitions;
  }

  onSource(data: { uri: string, data: string, media: { encoding: string, type: string } }) {
    this.sourceMap.set(data.uri, data.data.split(/\n/));
  }

  onGherkinDocument(data: { uri: string, document: GherkinDocument }) {
    // "ScenarioOutline"
    data.document.caseMap = new Map<number, GherkinTestCase>();
    data.document.stepMap = new Map<number, GherkinStep>();
    if (data.document.feature !== undefined) {
      for (const test of data.document.feature.children || []) {
        test.stepMap = new Map();
        if (test.type === "Background") {
          data.document.stepMap = new Map();
          for (const step of test.steps) {
            step.isBackground = true;
            data.document.stepMap.set(step.location!.line, step);
          }
        } else {
          for (const step of test.steps) {
            test.stepMap.set(step.location!.line, step);
          }
        }

        if (test.type === "ScenarioOutline") {
          for (const example of examplesToSensibleFormat(test.examples || [])) {
            const copy = { ...test };
            copy.example = example;
            data.document.caseMap.set(example.line, copy);
          }
        } else {
          data.document.caseMap.set(test.location!.line, test);
        }
      }
    }
    this.featureMap.set(data.uri, data.document);
  }

  onTestCasePrepared(data: { steps: SourceLocation[] } & SourceLocation) {
    this.stepsMap.clear();
    this.stepsMap.set(SourceLocation.toKey(data), data.steps);
    this.currentBefore = null;
    this.currentAfter = null;
  }

  onTestCaseStarted(data: SourceLocation) {
    const feature = this.featureMap.get(data.sourceLocation!.uri);
    if (feature === undefined || feature.feature === undefined) {
      throw new Error("Unknown feature");
    }
    const test = feature.caseMap === undefined
      ? undefined : feature.caseMap.get(data.sourceLocation!.line);
    if (test === undefined) {
      throw new Error("Unknown scenario");
    }

    this.currentGroup = this.allureRuntime.startGroup();
    this.currentTest =
      this.currentGroup.startTest(applyExample(test.name || "Unnamed test", test.example));

    const info = {
      f: feature.feature.name,
      t: test.name,
      a: <any>null
    };

    if (test.example !== undefined) {
      info.a = test.example.arguments;
      for (const prop in test.example.arguments) {
        if (!test.example.arguments.hasOwnProperty(prop)) continue;
        this.currentTest.addParameter(prop, test.example.arguments[prop]);
      }
    }

    this.currentTest.historyId = hash(JSON.stringify(info));
    this.currentTest.addLabel(LabelName.THREAD, `${process.pid}`); // parallel tests support

    this.currentTest.addLabel(LabelName.FEATURE, feature.feature.name);
    //this.currentTest.addLabel(LabelName.STORY, feature.feature.name);
    this.currentTest.description = stripIndent(test.description || "");
    for (const tag of [...(test.tags || []), ...feature.feature.tags]) {
      this.currentTest.addLabel(LabelName.TAG, tag.name);

      for (const label in this.labels) {
        if (!this.labels.hasOwnProperty(label)) continue;
        for (const reg of this.labels[label]) {
          const match = tag.name.match(reg);
          if (match != null && match.length > 1) {
            this.currentTest.addLabel(label, match[1]);
          }
        }
      }
    }
  }

  onTestStepStarted(data: { index: number, testCase: SourceLocation }) {
    const location = (this.stepsMap.get(SourceLocation.toKey(data.testCase)) || [])[data.index];

    const feature = this.featureMap.get(data.testCase.sourceLocation!.uri);
    if (feature === undefined) throw new Error("Unknown feature");
    const test = feature.caseMap === undefined
      ? undefined : feature.caseMap.get(data.testCase.sourceLocation!.line);
    if (test === undefined) throw new Error("Unknown scenario");
    let step: GherkinStep | undefined;
    if (location.sourceLocation !== undefined && feature.stepMap !== undefined) {
      step = test.stepMap.get(location.sourceLocation.line)
        || feature.stepMap.get(location.sourceLocation.line);
    } else {
      if (location.actionLocation === undefined) location.actionLocation = {
        uri: "unknown",
        line: -1
      };
      step = {
        location: { line: -1 },
        text: `${location.actionLocation.uri}:${location.actionLocation.line}`,
        keyword: ""
      };
    }
    if (step === undefined) throw new Error("Unknown step");

    let stepText = applyExample(`${step.keyword}${step.text}`, test.example);

    const isAfter = this.afterHooks.find(({ uri, line }) => {
      if (location.actionLocation === undefined) return false;
      return uri === location.actionLocation.uri &&
        line === location.actionLocation.line;
    });

    const isBefore = this.beforeHooks.find(({ uri, line }) => {
      if (location.actionLocation === undefined) return false;
      return uri === location.actionLocation.uri &&
        line === location.actionLocation.line;
    });

    if (step.isBackground) {
      if (this.currentBefore === null) this.currentBefore = this.currentGroup!.addBefore();
    } else if (isBefore) {
      if (this.currentBefore === null) this.currentBefore = this.currentGroup!.addBefore();
      stepText = `Before: ${isBefore.code!.name || step.text}`;
    } else if (isAfter) {
      if (this.currentAfter === null) this.currentAfter = this.currentGroup!.addAfter();
      stepText = `After: ${isAfter.code!.name || step.text}`;
    } else {
      if (this.currentBefore !== null) this.currentBefore = null;
      if (this.currentAfter !== null) this.currentAfter = null;
    }
    const allureStep =
      (this.currentAfter || this.currentBefore || this.currentTest)!.startStep(stepText);
    this.pushStep(allureStep);

    if (step.argument !== undefined) {
      if (step.argument.content !== undefined) {
        const file = this.allureRuntime.writeAttachment(step.argument.content, ContentType.TEXT);
        allureStep.addAttachment("Text", ContentType.TEXT, file);
      }
      if (step.argument.rows !== undefined) {
        const file = this.allureRuntime.writeAttachment(
          step.argument.rows.map(
            row => row.cells.map(
              cell => cell.value.replace(/\t/g, "    ")
            ).join("\t")
          ).join("\n"),
          ContentType.TSV
        );
        allureStep.addAttachment("Table", ContentType.TSV, file);
      }
    }
  }

  onTestStepAttachment(
    data: { index: number, data: string, media: { type: string }, testCase: SourceLocation }) {
    if (this.currentStep === null) throw new Error("There is no step to add attachment to");
    const type: ContentType = <ContentType>data.media.type;
    let content: string | Buffer = data.data;
    if ([ContentType.JPEG, ContentType.PNG, ContentType.WEBM].indexOf(type) >= 0) {
      content = Buffer.from(content, "base64");
    }
    const file = this.allureRuntime.writeAttachment(content, type);
    this.currentStep.addAttachment("attached", type, file);
  }

  onTestStepFinished(data: { index: number, result: Result, testCase: SourceLocation }) {
    const currentStep = this.currentStep; // eslint-disable-line prefer-destructuring
    if (currentStep === null) throw new Error("No current step defined");
    currentStep.status = statusTextToAllure(data.result.status);
    currentStep.stage = statusTextToStage(data.result.status);
    this.setException(currentStep, data.result.exception);
    currentStep.endStep();
    this.popStep();
  }

  onTestCaseFinished(data: { result: Result } & SourceLocation) {
    if (this.currentTest === null || this.currentGroup === null) {
      throw new Error("No current test info");
    }
    this.currentTest.status = statusTextToAllure(data.result.status);
    this.currentTest.stage = statusTextToStage(data.result.status);
    this.setException(this.currentTest, data.result.exception);

    this.currentTest.endTest();
    this.currentGroup.endGroup();
  }

  private setException(target: ExecutableItemWrapper, exception?: Error | string) {
    if (exception !== undefined) {
      if (typeof exception === "string") {
        target.detailsMessage = this.exceptionFormatter(exception);
      } else {
        target.detailsMessage =
          this.exceptionFormatter(exception.message || "Error.message === undefined");
        target.detailsTrace = exception.stack || "";
      }
    }
  }

  pushStep(step: AllureStep): void {
    this.stepStack.push(step);
  }

  popStep(): void {
    this.stepStack.pop();
  }

  get currentStep(): AllureStep | null {
    if (this.stepStack.length > 0) return this.stepStack[this.stepStack.length - 1];
    return null;
  }

  writeAttachment(content: Buffer | string, type: ContentType): string {
    return this.allureRuntime.writeAttachment(content, type);
  }

  getGlobalInfoWriter(): GlobalInfoWriter {
    return this.allureRuntime as GlobalInfoWriter;
  }
}


