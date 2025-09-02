import WDIOReporter from "@wdio/reporter";
import { Stage, Status, LabelName } from "allure-js-commons";
import { ReporterRuntime, createDefaultWriter, getSuiteLabels } from "allure-js-commons/sdk/reporter";

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

  // Helper function to collect test path recursively
  collectTestPath(test) {
    const path = [];
    let currentTest = test;
    
    // Collect the path from the test structure
    while (currentTest && currentTest.parent) {
      path.unshift(currentTest.parent);
      // In WebdriverIO, we need to traverse up the parent chain
      // This is a simplified approach - in real scenarios, you might need to access the full test hierarchy
      currentTest = currentTest.parent;
    }
    
    // If we have a fullTitle, we can parse it to get the complete path
    if (test.fullTitle) {
      const parts = test.fullTitle.split(' ');
      if (parts.length > 1) {
        // Remove the test name (last part) and use the rest as the path
        return parts.slice(0, -1);
      }
    }
    
    return path;
  }

  onTestStart(test) {
    this.currentTest = this.runtime.startTest({
      name: test.title,
      fullName: test.fullTitle, // TODO: Construct proper fullName according to Allure conventions
      status: Status.PASSED,
      stage: Stage.RUNNING,
    });

    // Collect test path for suite labels
    const testPath = this.collectTestPath(test);
    const suiteLabels = getSuiteLabels(testPath);

    // Add all labels and parameters in a single updateTest call
    this.runtime.updateTest(this.currentTest, (result) => {
      // Add suite labels
      suiteLabels.forEach(label => {
        result.labels.push(label);
      });

      // Add framework label
      result.labels.push({ name: LabelName.FRAMEWORK, value: "wdio" });

      // Add custom labels if present
      if (test.severity) {
        result.labels.push({ name: LabelName.SEVERITY, value: test.severity });
      }
      if (test.feature) {
        result.labels.push({ name: LabelName.FEATURE, value: test.feature });
      }
      if (test.story) {
        result.labels.push({ name: LabelName.STORY, value: test.story });
      }

      // Add parameters if present
      if (test.parameterNames && test.parameterValues) {
        const names = test.parameterNames;
        const values = test.parameterValues;
        if (Array.isArray(names) && Array.isArray(values) && names.length === values.length) {
          result.parameters = [
            ...(result.parameters || []),
            ...names.map((name, i) => ({ name, value: String(values[i]) })),
          ];
        }
      }
    });
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

    // Collect test path for suite labels
    const testPath = this.collectTestPath(test);
    const suiteLabels = getSuiteLabels(testPath);

    // Add all labels in a single updateTest call
    this.runtime.updateTest(testId, (result) => {
      // Add suite labels
      suiteLabels.forEach(label => {
        result.labels.push(label);
      });

      // Add framework label
      result.labels.push({ name: LabelName.FRAMEWORK, value: "wdio" });
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
          result.attachments.push({
            name: output.command || "Command Result",
            type: "text/plain",
            source: Buffer.from(value).toString("base64"),
          });
        });
      }
    }
  }
}
