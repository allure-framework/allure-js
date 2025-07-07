import WDIOReporter from "@wdio/reporter";
import { Stage, Status } from "allure-js-commons";
import { ReporterRuntime, createDefaultWriter } from "allure-js-commons/sdk/reporter";

export class AllureReporter extends WDIOReporter {
  constructor(options = {}) {
    const { resultsDir = "./allure-results", ...restOptions } = options;
    const outputDir = resultsDir || "./allure-results";
    super({
      outputDir,
      ...restOptions,
    });

    this.runtime = new ReporterRuntime({
      writer: createDefaultWriter({ resultsDir: outputDir }),
      ...restOptions,
    });
  }

  onTestStart(test) {
    this.currentTest = this.runtime.startTest({
      name: test.title,
      fullName: test.fullTitle, // TODO: Construct proper fullName according to Allure conventions
      status: Status.PASSED,
      stage: Stage.RUNNING,
    });

    // Add labels in a single updateTest call
    this.runtime.updateTest(this.currentTest, (result) => {
      if (test.parent) {
        result.labels.push({ name: "suite", value: test.parent });
      }
      result.labels.push({ name: "framework", value: "wdio" });
    });

    // Add custom labels if present
    this.runtime.updateTest(this.currentTest, (result) => {
      if (test.severity) {
        result.labels.push({ name: "severity", value: test.severity });
      }
      if (test.feature) {
        result.labels.push({ name: "feature", value: test.feature });
      }
      if (test.story) {
        result.labels.push({ name: "story", value: test.story });
      }
    });

    // Add parameters if present
    if (test.parameterNames && test.parameterValues) {
      const names = test.parameterNames;
      const values = test.parameterValues;
      if (Array.isArray(names) && Array.isArray(values) && names.length === values.length) {
        this.runtime.updateTest(this.currentTest, (result) => {
          result.parameters = [
            ...(result.parameters || []),
            ...names.map((name, i) => ({ name, value: String(values[i]) })),
          ];
        });
      }
    }
  }

  onTestPass(test) {
    if (this.currentTest) {
      this.runtime.updateTest(this.currentTest, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      // Process any attachments that were added during the test
      this.processAttachments(test);
      this.runtime.stopTest(this.currentTest);
      this.runtime.writeTest(this.currentTest);
    }
  }

  onTestFail(test) {
    if (this.currentTest) {
      this.runtime.updateTest(this.currentTest, (result) => {
        result.status = Status.FAILED;
        result.stage = Stage.FINISHED;
        if (test.error) {
          result.statusDetails = {
            message: test.error.message,
            trace: test.error.stack,
          };
        }
      });
      // Process any attachments that were added during the test
      this.processAttachments(test);
      this.runtime.stopTest(this.currentTest);
      this.runtime.writeTest(this.currentTest);
    }
  }

  onTestSkip(test) {
    const testId = this.runtime.startTest({
      name: test.title,
      fullName: test.fullTitle, // TODO: Construct proper fullName according to Allure conventions
      status: Status.SKIPPED,
      stage: Stage.PENDING,
    });

    // Add labels in a single updateTest call
    this.runtime.updateTest(testId, (result) => {
      if (test.parent) {
        result.labels.push({ name: "suite", value: test.parent });
      }
      result.labels.push({ name: "framework", value: "wdio" });
    });

    // Process any attachments
    this.processAttachments(test);

    this.runtime.stopTest(testId);
    this.runtime.writeTest(testId);
  }

  onRunnerEnd() {
    this.runtime.writeEnvironmentInfo();
    this.runtime.writeCategoriesDefinitions();
  }

  processAttachments(test) {
    if (!test.output || !Array.isArray(test.output)) {
      return;
    }

    for (const output of test.output) {
      if (output.type === "result" && output.result?.value) {
        const value = String(output.result.value);
        this.runtime.updateTest(this.currentTest || "", (result) => {
          result.attachments = [
            ...(result.attachments || []),
            {
              name: output.command || "Command Result",
              type: "text/plain",
              source: Buffer.from(value).toString("base64"),
            },
          ];
        });
      }
    }
  }
} 