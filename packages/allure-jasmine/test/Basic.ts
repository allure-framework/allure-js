import { InMemoryAllureRuntime, LabelName, Stage, Status, TestResult } from "allure-js-commons";
import { JasmineAllureReporter } from "../src/JasmineAllureReporter";

async function runTest(fun: (j: any) => void): Promise<InMemoryAllureRuntime> {
  const runtime = new InMemoryAllureRuntime({
    resultsDir: "./out/allure-results"
  });

  const d = new Promise((resolve, reject) => {
    const reporter = new JasmineAllureReporter(runtime);
    const env: any = eval("new jasmine.Env()");
    env.addReporter(reporter);
    fun(env);
    env.afterAll(function() {
      resolve();
    });
    env.execute();
  });

  await d;
  return runtime;
}

async function runSingleTest(fun: Function): Promise<TestResult> {
  const runtime = await runTest(j => {
    j.describe("Describe name", function() {
      j.it("Test name", fun.bind(j));
    });
  });
  return runtime.getTestByName("Test name");
}

describe("Basics", function() {
  it("test example", async function() {
    const test = await runSingleTest(function(this: any) {
      this.expect(1).toEqual(2);
    });
    expect(test.status).toBe(Status.FAILED);

    const test2 = await runSingleTest(function(this: any) {
      this.expect(1).toEqual(1);
    });
    expect(test2.status).toBe(Status.PASSED);
  });
});

/*
todo:
failing test
throwing test
skipped test
test pending with reason
test nested in 3 describes
async passing test
async failing test
attach text
attach inside step
step
nested step
failing step
 */
