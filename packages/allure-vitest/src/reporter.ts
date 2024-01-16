import {
  AllureGroup,
  AllureRuntime,
  LabelName,
  Link,
  MessageAllureWriter,
  MetadataMessage,
  Stage,
  Status,
} from "allure-js-commons";
import { File, Reporter, Task } from "vitest";
import { AllureMeta, AllureStep } from "./model.js";

export interface AllureReporterOptions {
  testMode?: boolean;
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
}

export default class AllureReporter implements Reporter {
  private allureRuntime: AllureRuntime;
  private options: AllureReporterOptions;

  constructor(options: AllureReporterOptions) {
    this.options = options;
  }

  private processMetadataLinks(links: Link[]): Link[] {
    return links.map((link) => {
      // TODO:
      // @ts-ignore
      const matcher = this.options.links?.find?.(({ type }) => type === link.type);

      // TODO:
      if (!matcher || link.url.startsWith("http")) {
        return link;
      }

      const url = matcher.urlTemplate.replace("%s", link.url);

      return {
        ...link,
        url,
      };
    });
  }

  onInit() {
    this.allureRuntime = new AllureRuntime({
      resultsDir: this.options.resultsDir ?? "allure-results",
      writer: this.options.testMode ? new MessageAllureWriter() : undefined,
    });
  }

  onFinished(files?: File[]) {
    const rootSuite = this.allureRuntime.startGroup(undefined);

    for (const file of files || []) {
      const group = rootSuite.startGroup(file.name);

      group.name = file.name;

      for (const task of file.tasks) {
        this.handleTask(group, task);
      }

      group.endGroup();
    }

    rootSuite.endGroup();
  }

  handleTask(parent: AllureGroup, task: Task) {
    if (task.type === "suite") {
      const group = parent.startGroup(task.name);

      group.name = task.name;

      for (const innerTask of task.tasks) {
        this.handleTask(group, innerTask);
      }

      group.endGroup();
      return;
    }

    const { currentTest = {} } = task.meta as { currentTest: MetadataMessage };
    const links = currentTest.links ? this.processMetadataLinks(currentTest.links) : [];
    const test = parent.startTest(task.name, 0);

    test.name = task.name;
    test.fullName = `${task.file.name}#${task.name}`;

    test.applyMetadata({
      ...currentTest,
      links,
    });
    test.addLabel(LabelName.SUITE, parent.name);

    if (task.suite.suite?.name) {
      test.addLabel(LabelName.PARENT_SUITE, task.suite.suite.name);
    }

    switch (task.result?.state) {
      case "fail": {
        test.detailsMessage = task.result.errors?.[0]?.message || "";
        test.detailsTrace = task.result.errors?.[0]?.stack || "";
        test.status = Status.FAILED;
        break;
      }
      case "pass": {
        test.status = Status.PASSED;
        break;
      }
      case "skip": {
        test.status = Status.SKIPPED;
        break;
      }
    }

    test.stage = Stage.FINISHED;
    test.calculateHistoryId();
    test.endTest(task.result?.duration);
  }
}
