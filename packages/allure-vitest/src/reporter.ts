import {
  AllureGroup,
  AllureRuntime,
  ExecutableItem,
  LabelName,
  MetadataMessage,
  Stage,
  Status,
} from "allure-js-commons";
import { File, Reporter, Task } from "vitest";
import { AllureMeta, AllureStep } from "./model.js";

export default class AllureReporter implements Reporter {
  private allureRuntime: AllureRuntime;

  onInit(ctx) {
    this.allureRuntime = new AllureRuntime({
      resultsDir: ctx.config.outputFile.allure ?? "allure-results",
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

    const { allureMetadataMessage = {} } = task.meta as { allureMetadataMessage: MetadataMessage };
    const test = parent.startTest(task.name, 0);

    test.name = task.name;
    test.fullName = `${task.file.name}#${task.name}`;

    test.applyMetadata(allureMetadataMessage);
    test.addLabel(LabelName.SUITE, parent.name);

    if (task.suite.suite?.name) {
      test.addLabel(LabelName.PARENT_SUITE, task.suite.suite.name);
    }

    switch (task.result?.state) {
      case "fail": {
        test.detailsMessage = task.result.errors[0].message;
        test.detailsTrace = task.result.errors[0].stack;
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

    test.calculateHistoryId();
    test.endTest(task.result?.duration);
  }
}
