import { hostname } from "node:os";
import { basename, normalize, relative } from "node:path";
import { cwd, env } from "node:process";
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
import { getSuitePath, getTestFullName } from "./utils.js";

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
  private hostname: string = ALLURE_HOST_NAME || hostname();

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

  onInit(vitest: Vitest) {
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

    const { currentTest = {}, VITEST_POOL_ID } = task.meta as {
      currentTest: MetadataMessage;
      VITEST_POOL_ID: string;
    };
    const skippedByTestPlan = currentTest.labels?.some(({ name }) => name === ALLURE_SKIPPED_BY_TEST_PLAN_LABEL);

    // do not report tests skipped by test plan
    if (skippedByTestPlan) {
      return;
    }

    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = currentTest.displayName || titleMetadata.cleanTitle;
    const links = currentTest.links ? this.processMetadataLinks(currentTest.links) : [];
    const labels: Label[] = [].concat(currentTest.labels || []).concat(titleMetadata.labels);
    const test = parent.startTest(testDisplayName, task.result.startTime);
    const suitePath = getSuitePath(task);
    const normalizedTestPath = normalize(relative(cwd(), task.file.filepath))
      .replace(/^\//, "")
      .split("/")
      .filter((item: string) => item !== basename(task.file.filepath));

    test.fullName = getTestFullName(task, cwd());
    test.applyMetadata({
      ...currentTest,
      labels,
      links,
    });
    test.addLabel(LabelName.FRAMEWORK, "vitest");
    test.addLabel(LabelName.LANGUAGE, "javascript");
    test.addLabel(LabelName.HOST, this.hostname);

    const thread_id = ALLURE_THREAD_NAME || (VITEST_POOL_ID && `${this.hostname}-vitest-worker-${VITEST_POOL_ID}`);
    if (thread_id) {
      test.addLabel(LabelName.THREAD, thread_id);
    }

    getSuitesLabels(suitePath).forEach((label) => {
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

    const actualDuration = task.result
      ? Math.max(0, task.file.collectDuration || 0) +
        Math.max(0, task.file.setupDuration || 0) +
        Math.max(0, task.result?.duration || 0) +
        Math.max(0, task.file.environmentLoad || 0) +
        Math.max(0, task.file.prepareDuration || 0)
      : 0;

    test.calculateHistoryId();
    test.endTest(task.result.startTime + actualDuration);
  }
}
