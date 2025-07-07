import { mkdirSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { Writable } from "stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AllureReporter } from "../../src/index.js";
import { Status } from "allure-js-commons";

function getLatestResult(resultsDir) {
  const files = readdirSync(resultsDir);
  const resultFiles = files.filter((file) => file.endsWith("-result.json"));
  if (resultFiles.length === 0) {
    throw new Error("No result files found");
  }
  const latestFile = resultFiles[resultFiles.length - 1];
  const content = readFileSync(join(resultsDir, latestFile), "utf8");
  return JSON.parse(content);
}

describe("AllureReporter", () => {
  let reporter;
  const tempDir = join(process.cwd(), "temp-test-results");

  beforeEach(() => {
    mkdirSync(tempDir, { recursive: true });
    reporter = new AllureReporter({
      resultsDir: tempDir,
      stdout: true,
      writeStream: new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      }),
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should handle passed test correctly", () => {
    const test = {
      uid: "1",
      cid: "0-0",
      title: "test case",
      fullTitle: "suite test case",
      state: "passed",
      parent: "suite",
      duration: 1000,
      start: new Date(),
      type: "test",
      output: [],
      errors: [],
      retries: 0,
      end: new Date(),
      _duration: 1000,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: false,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "normal",
    };

    reporter.onTestStart(test);
    reporter.onTestPass(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("test case");
    expect(result.status).toBe("passed");
    expect(result.stage).toBe("finished");

    // Verify framework label
    const frameworkLabel = result.labels.find((l) => l.name === "framework");
    expect(frameworkLabel).toBeDefined();
    expect(frameworkLabel?.value).toBe("wdio");
  });

  it("should handle failed test correctly", () => {
    const error = new Error("Test failed");
    const test = {
      uid: "2",
      cid: "0-0",
      title: "failed test",
      fullTitle: "suite failed test",
      state: "failed",
      parent: "suite",
      error,
      duration: 1000,
      start: new Date(),
      type: "test",
      output: [],
      errors: [error],
      retries: 0,
      end: new Date(),
      _duration: 1000,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: false,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "normal",
    };

    reporter.onTestStart(test);
    reporter.onTestFail(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("failed test");
    expect(result.status).toBe("failed");
    expect(result.stage).toBe("finished");

    // Verify framework label
    const frameworkLabel = result.labels.find((l) => l.name === "framework");
    expect(frameworkLabel).toBeDefined();
    expect(frameworkLabel?.value).toBe("wdio");
  });

  it("should handle skipped test correctly", () => {
    const test = {
      uid: "3",
      cid: "0-0",
      title: "skipped test",
      fullTitle: "suite skipped test",
      state: "skipped",
      parent: "suite",
      duration: 0,
      start: new Date(),
      type: "test",
      output: [],
      errors: [],
      retries: 0,
      end: new Date(),
      _duration: 0,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: true,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "normal",
    };

    reporter.onTestSkip(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("skipped test");
    expect(result.status).toBe("skipped");
    expect(result.stage).toBe("pending");
  });

  it("should handle test with attachments correctly", () => {
    const test = {
      uid: "4",
      cid: "0-0",
      title: "test with attachment",
      fullTitle: "suite test with attachment",
      state: "passed",
      parent: "suite",
      duration: 1000,
      start: new Date(),
      type: "test",
      output: [
        {
          type: "result",
          command: "screenshot",
          result: {
            value: "base64-encoded-screenshot-data",
          },
        },
      ],
      errors: [],
      retries: 0,
      end: new Date(),
      _duration: 1000,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: false,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "normal",
    };

    reporter.onTestStart(test);
    reporter.onTestPass(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("test with attachment");
    expect(result.attachments).toBeDefined();
    expect(result.attachments.length).toBe(1);
    expect(result.attachments[0].name).toBe("screenshot");
    expect(result.attachments[0].type).toBe("text/plain");
  });

  it("should handle test with custom labels correctly", () => {
    const test = {
      uid: "5",
      cid: "0-0",
      title: "test with custom labels",
      fullTitle: "suite test with custom labels",
      state: "passed",
      parent: "suite",
      duration: 1000,
      start: new Date(),
      type: "test",
      output: [],
      errors: [],
      retries: 0,
      end: new Date(),
      _duration: 1000,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: false,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "critical",
      feature: "authentication",
      story: "user login",
    };

    reporter.onTestStart(test);
    reporter.onTestPass(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("test with custom labels");

    // Verify custom labels
    const severityLabel = result.labels.find((l) => l.name === "severity");
    expect(severityLabel).toBeDefined();
    expect(severityLabel?.value).toBe("critical");

    const featureLabel = result.labels.find((l) => l.name === "feature");
    expect(featureLabel).toBeDefined();
    expect(featureLabel?.value).toBe("authentication");

    const storyLabel = result.labels.find((l) => l.name === "story");
    expect(storyLabel).toBeDefined();
    expect(storyLabel?.value).toBe("user login");
  });

  it("should handle test with parameters correctly", () => {
    const test = {
      uid: "6",
      cid: "0-0",
      title: "test with parameters",
      fullTitle: "suite test with parameters",
      state: "passed",
      parent: "suite",
      duration: 1000,
      start: new Date(),
      type: "test",
      output: [],
      errors: [],
      retries: 0,
      end: new Date(),
      _duration: 1000,
      pass: () => {},
      fail: (errors) => {},
      skip: (reason) => {},
      pending: false,
      _stringifyDiffObjs: () => {},
      complete: false,
      severity: "normal",
      parameterNames: ["browser", "version"],
      parameterValues: ["chrome", "120"],
    };

    reporter.onTestStart(test);
    reporter.onTestPass(test);

    const result = getLatestResult(tempDir);
    expect(result.name).toBe("test with parameters");
    expect(result.parameters).toBeDefined();
    expect(result.parameters.length).toBe(2);
    expect(result.parameters[0].name).toBe("browser");
    expect(result.parameters[0].value).toBe("chrome");
    expect(result.parameters[1].name).toBe("version");
    expect(result.parameters[1].value).toBe("120");
  });
}); 