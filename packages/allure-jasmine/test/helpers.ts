import { Allure, InMemoryAllureWriter } from "allure-js-commons";
import { JasmineAllureReporter } from "../src/JasmineAllureReporter";
import Env = jasmine.Env;

export async function runTest(fun: (j: Env, k: Allure) => void) {
  const writer = new InMemoryAllureWriter();
  await new Promise((resolve, reject) => {
    const reporter = new JasmineAllureReporter({ writer, resultsDir: "unused" });
    const env: Env = eval("new jasmine.Env()");
    env.addReporter(reporter);
    env.addReporter({ jasmineDone: resolve });
    const allure = reporter.getInterface();
    fun(env, allure);
    env.execute();
  });
  return writer;
}

export function delay(ms: number) {
  return new Promise<void>(function(resolve) {
    setTimeout(resolve, ms);
  });
}

export function delayFail(ms: number) {
  return new Promise<void>(function(resolve, reject) {
    setTimeout(() => reject(new Error("Async error")), ms);
  });
}

/*
todo:
failing test +

throwing test

skipped test ++

test pending with reason +
test nested in 3 describes

async passing test
async failing test

attach text
attach inside step

step +
nested step ++
failing step ~
 */
