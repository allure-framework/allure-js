import { hostname } from "node:os";
import { basename, normalize } from "node:path";
import { env, pid } from "node:process";
import { File, Reporter, Suite, Task, Vitest } from "vitest";
import {
  AllureGroup,
  AllureRuntime,
  Label,
  LabelName,
  Link,
  MessageAllureWriter,
  MetadataMessage,
  Stage,
  Status,
  extractMetadataFromString,
  getSuitesLabels,
} from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";

export interface AllureReporterOptions {
  testMode?: boolean;
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
}

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = env;

export default class AllureReporter implements Reporter {
  private allureRuntime: AllureRuntime;
  private options: AllureReporterOptions;
  private rootDir: string;

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

  private getSuitePath(task: Task): string[] {
    const path = [];
    let currentSuite: Suite | undefined = task.suite;

    while (currentSuite) {
      // root suite has no name and shouldn't be included to the path
      if (!currentSuite.name) {
        break;
      }

      path.unshift(currentSuite.name);
      currentSuite = currentSuite.suite;
    }

    return path;
  }

  onInit(vitest: Vitest) {
    this.rootDir = vitest.runner.root;
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
    // do not report skipped tests
    if (task.mode === "skip" && !task.result) {
      return;
    }

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
    const skippedByTestPlan = currentTest.labels?.some(({ name }) => name === ALLURE_SKIPPED_BY_TEST_PLAN_LABEL);

    // do not report tests skipped by test plan
    if (skippedByTestPlan) {
      return;
    }

    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = currentTest.displayName || titleMetadata.cleanTitle;
    const links = currentTest.links ? this.processMetadataLinks(currentTest.links) : [];
    const labels: Label[] = [].concat(currentTest.labels || []).concat(titleMetadata.labels);
    const test = parent.startTest(testDisplayName);
    const suitePath = this.getSuitePath(task);
    const normalizedTestPath = normalize(task.file.filepath.replace(this.rootDir, ""))
      .replace(/^\//, "")
      .split("/")
      .filter((item: string) => item !== basename(task.file.filepath));

    test.fullName = `${task.file.name}#${suitePath.concat(task.name).join(" ")}`;
    test.applyMetadata({
      ...currentTest,
      labels,
      links,
    });
    test.addLabel(LabelName.FRAMEWORK, "vitest");
    test.addLabel(LabelName.LANGUAGE, "javascript");
    test.addLabel(LabelName.THREAD, ALLURE_THREAD_NAME || pid.toString());
    test.addLabel(LabelName.HOST, ALLURE_HOST_NAME || hostname.toString());

    getSuitesLabels(this.getSuitePath(task)).forEach((label) => {
      test.addLabel(label.name, label.value);
    });

    if (normalizedTestPath.length) {
      test.addLabel(LabelName.PACKAGE, normalizedTestPath.join("."));
    }

    switch (task.result?.state) {
      case "fail": {
        test.detailsMessage = task.result.errors?.[0]?.message || "";
        test.detailsTrace = task.result.errors?.[0]?.stack || "";
        test.status = Status.FAILED;
        test.stage = Stage.FINISHED;
        break;
      }
      case "pass": {
        test.status = Status.PASSED;
        test.stage = Stage.FINISHED;
        break;
      }
      case "skip": {
        test.status = Status.SKIPPED;
        test.stage = Stage.PENDING;
        break;
      }
    }

    test.calculateHistoryId();
    test.endTest(task.result?.duration);
  }
}
