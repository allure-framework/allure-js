import { hostname } from "node:os";
import { basename, normalize, relative } from "node:path";
import { cwd, env } from "node:process";
import { File, Reporter, Task } from "vitest";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { LabelName, Stage, Status, extractMetadataFromString, getSuitesLabels } from "allure-js-commons/new";
import { Config, RuntimeMessage } from "allure-js-commons/new/sdk";
import { AllureNodeReporterRuntime, FileSystemAllureWriter, MessageAllureWriter } from "allure-js-commons/new/sdk/node";
import { getSuitePath, getTestFullName } from "./utils.js";

export interface AllureVitestReporterConfig extends Omit<Config, "writer"> {
  testMode?: boolean;
}

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = env;

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime: AllureNodeReporterRuntime;
  private config: AllureVitestReporterConfig;
  private hostname: string = ALLURE_HOST_NAME || hostname();

  constructor(config: AllureVitestReporterConfig) {
    this.config = config;
  }

  onInit() {
    const { listeners, testMode, ...config } = this.config;
    const writer = testMode
      ? new MessageAllureWriter()
      : new FileSystemAllureWriter({
          resultsDir: config.resultsDir,
        });

    this.allureReporterRuntime = new AllureNodeReporterRuntime({
      ...config,
      writer,
      listeners,
    });
  }

  onFinished(files?: File[]) {
    for (const file of files || []) {
      for (const task of file.tasks) {
        this.handleTask(task);
      }
    }
  }

  async handleTask(task: Task) {
    // do not report skipped tests
    if (task.mode === "skip" && !task.result) {
      return;
    }

    if (task.type === "suite") {
      for (const innerTask of task.tasks) {
        await this.handleTask(innerTask);
      }
      return;
    }

    const { allureRuntimeMessages = [], VITEST_POOL_ID } = task.meta as {
      allureRuntimeMessages: RuntimeMessage[];
      VITEST_POOL_ID: string;
    };
    // TODO: maybe make part of core utils?
    const skippedByTestPlan = allureRuntimeMessages.some((message) => {
      if (message.type === "metadata") {
        return (message.data?.labels || []).some(({ name }) => name === ALLURE_SKIPPED_BY_TEST_PLAN_LABEL);
      }

      return false;
    });

    // do not report tests skipped by test plan
    if (skippedByTestPlan) {
      return;
    }

    const suitePath = getSuitePath(task);
    const normalizedTestPath = normalize(relative(cwd(), task.file.filepath))
      .replace(/^\//, "")
      .split("/")
      .filter((item: string) => item !== basename(task.file.filepath));
    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = titleMetadata.cleanTitle || task.name;
    const testFullname = getTestFullName(task, cwd());
    const testUUID = await this.allureReporterRuntime.start(
      {
        name: testDisplayName,
      },
      task.result.startTime,
    );

    await this.allureReporterRuntime.update(testUUID, async (result) => {
      const threadId = ALLURE_THREAD_NAME || (VITEST_POOL_ID && `${this.hostname}-vitest-worker-${VITEST_POOL_ID}`);

      result.fullName = testFullname;
      result.labels.push({
        name: LabelName.FRAMEWORK,
        value: "vitest",
      });
      result.labels.push({
        name: LabelName.LANGUAGE,
        value: "javascript",
      });
      result.labels.push({
        name: LabelName.HOST,
        value: this.hostname,
      });
      result.labels.push(...titleMetadata.labels);
      result.labels.push(...getSuitesLabels(suitePath));

      if (threadId) {
        result.labels.push({
          name: LabelName.THREAD,
          value: threadId,
        });
      }

      if (normalizedTestPath.length) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: normalizedTestPath.join("."),
        });
      }

      await this.allureReporterRuntime.applyRuntimeMessages(testUUID, allureRuntimeMessages);

      switch (task.result?.state) {
        case "fail": {
          result.statusDetails = {
            message: task.result.errors?.[0]?.message || "",
            trace: task.result.errors?.[0]?.stack || "",
          };
          result.status = Status.FAILED;
          result.stage = Stage.FINISHED;
          break;
        }
        case "pass": {
          result.status = Status.PASSED;
          result.stage = Stage.FINISHED;
          break;
        }
        case "skip": {
          result.status = Status.SKIPPED;
          result.stage = Stage.PENDING;
          break;
        }
      }
    });
    await this.allureReporterRuntime.stop(testUUID, task.result.startTime + task.result?.duration || 0);
    await this.allureReporterRuntime.write(testUUID);
  }
}
