import { hostname } from "os";
import { Writable } from "stream";
import { AllureGroup, AllureRuntime, AllureTest, LabelName, Stage, Status } from "allure-js-commons";
import minimist from "minimist";
import Parser, { Extra, FinalResult, Plan, Result } from "tap-parser";

const allureTap = (process: NodeJS.Process): Writable => {
  const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
  const host = ALLURE_HOST_NAME || hostname();
  const thread = ALLURE_THREAD_NAME || process.pid.toString();
  const args = minimist(process.argv.slice(2));
  const resultsDir = args["results-dir"] as string || ".";

  const runningTests: Map<number, AllureTest> = new Map();
  const runtime = new AllureRuntime({
    resultsDir,
  });
  const tapParser = new Parser();

  const endTest = (id: number) => {
    const currentTest = runningTests.get(id);

    if (!currentTest) {
      return;
    }

    currentTest.endTest();
    runningTests.delete(id);
  };

  tapParser.on("assert", (res: Result) => {
    const currentTest = new AllureTest(runtime, Date.now());
    const testPath = res.name.split(" › ");

    currentTest.name = testPath[testPath.length - 1];
    currentTest.fullName = res.name;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.HOST, host);
    currentTest.addLabel(LabelName.THREAD, thread);

    if (testPath.length > 1) {
      currentTest.addLabel(
        LabelName.SUITE,
        testPath[testPath.length - 2],
      );
    }

    if (testPath.length > 2) {
      currentTest.addLabel(
        LabelName.PARENT_SUITE,
        testPath.slice(0, testPath.length - 2).join(" > "),
      );
    }

    runningTests.set(res.id, currentTest);
  });
  tapParser.on("pass", (res: Result) => {
    const currentTest = runningTests.get(res.id);

    if (!currentTest) {
      throw new Error("No running test found!");
    }

    currentTest.status = Status.PASSED;
    currentTest.stage = Stage.FINISHED;

    endTest(res.id);
  });
  tapParser.on("fail", (res: Result) => {
    const currentTest = runningTests.get(res.id);

    if (!currentTest) {
      throw new Error("No running test found!");
    }

    const { message, values, at = "" } = res?.diag || {};
    const errorMessage = values
      ? Object.keys(values).reduce((acc, key) => `${key}: ${values[key]}`, "")
      : message;

    currentTest.status = Status.FAILED;
    currentTest.stage = Stage.FINISHED;
    currentTest.statusDetails = {
      message: errorMessage,
      trace: at || "",
    };

    endTest(res.id);
  });
  tapParser.on("skip", (res: Result) => {
    const currentTest = runningTests.get(res.id);

    if (!currentTest) {
      throw new Error("No running test found!");
    }

    currentTest.status = Status.SKIPPED;
    currentTest.stage = Stage.FINISHED;

    endTest(res.id);
  });

  return process.stdin.pipe(tapParser);
};

export default allureTap;
