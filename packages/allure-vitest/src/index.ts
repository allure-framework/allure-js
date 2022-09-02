import { BroadcastChannel } from "node:worker_threads";
import { AllureConfig, AllureGroup, AllureRuntime, LabelName, Status } from "allure-js-commons";

import { File, Reporter, Task, Vitest } from "vitest";
import { AllureMessageType, AllureMetadata } from "./helpers";

export class AllureReporter implements Reporter {
  private allureRuntime: AllureRuntime | null;
  private messagesInbox = new Map<string, AllureMetadata[]>();

  constructor(config?: Partial<AllureConfig>) {
    const bc = new BroadcastChannel("allure-meta-broadcast");
    bc.onmessage = (ev) => this.handleMessage(ev as AllureMessageType);

    this.allureRuntime = new AllureRuntime({
      resultsDir: "allure-results",
      ...config,
    });
  }

  handleMessage(ev: AllureMessageType) {
    const testId = ev.testId;
    const message = ev.data;
    const messagesById = this.messagesInbox.get(testId) || [];
    this.messagesInbox.set(testId, [...messagesById, message]);
  }

  onFinished(files?: File[]) {
    if (!this.allureRuntime) {
      return;
    }
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
    } else {
      const test = parent.startTest(task.name, 0);
      const tasksById = this.messagesInbox.get(task.id);
      tasksById?.forEach((ev) => {
        switch (ev.type) {
          case "label": {
            test.addLabel(ev.value.name, ev.value.value);
            break;
          }
          case "description": {
            test.description = ev.value || "";
            break;
          }
          case "link": {
            test.addLink(ev.value.url, ev.value.name, ev.value.type);
            break;
          }
          case "parameter": {
            test.addParameter(ev.value.name, ev.value.value, {
              excluded: ev.value.excluded,
              hidden: ev.value.hidden,
            });
            break;
          }
        }
      });

      test.name = task.name;
      test.fullName = `${task.file?.name || ""}#${task.name}`;
      switch (task.result?.state) {
        case "fail": {
          test.detailsMessage = task.result.error?.message;
          test.detailsTrace = task.result.error?.stackStr;
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
