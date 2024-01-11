import {
  AllureGroup,
  AllureRuntime,
  ExecutableItem,
  LabelName,
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

  handleStep(step: AllureStep): ExecutableItem {
    return {
      name: step.name,
      start: step.start,
      stop: step.stop,
      status: step.status,
      stage: Stage.FINISHED,
      attachments: step.attachments.map((attachment) => {
        const filename = this.allureRuntime.writeAttachment(attachment.content, {
          contentType: attachment.contentType,
          fileExtension: attachment.fileExtension,
        });
        return {
          name: attachment.name,
          type: attachment.contentType,
          source: filename,
        };
      }),
      steps: step.steps.map((s) => this.handleStep(s)),
      statusDetails: step.statusDetails,
      parameters: [],
    };
  }

  handleTask(parent: AllureGroup, task: Task) {
    if (task.type === "suite") {
      const group = parent.startGroup(task.name);
      group.name = task.name;
      for (const innerTask of task.tasks) {
        this.handleTask(group, innerTask);
      }
      group.endGroup();
    } else {
      const test = parent.startTest(task.name, 0);
      test.name = task.name;
      test.fullName = `${task.file.name}#${task.name}`;
      const { allure } = task.meta as { allure: AllureMeta };
      if (allure) {
        for (const step of allure.currentTest.steps) {
          test.addStep(this.handleStep(step));
        }
        for (const attachment of allure.currentTest.attachments) {
          const filename = this.allureRuntime.writeAttachment(attachment.content, {
            contentType: attachment.contentType,
            fileExtension: attachment.fileExtension,
          });
          test.addAttachment(attachment.name, attachment.contentType, filename);
        }
        for (const label of allure.currentTest.labels) {
          test.addLabel(label.name, label.value);
        }
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
      test.addLabel(LabelName.SUITE, parent.name);
      if (task.suite.suite?.name) {
        test.addLabel(LabelName.PARENT_SUITE, task.suite.suite.name);
      }
      test.historyId = task.id;
      test.endTest(task.result?.duration);
    }
  }
}
