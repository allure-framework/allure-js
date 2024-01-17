import { loadConfiguration, loadSupport, runCucumber } from "@cucumber/cucumber/api";
import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { match, restore, stub } from "sinon";
import { TestResult } from "allure-js-commons";

export const runCucumberTests = async (tests: string[]) => {
  const writeFileSpy = stub(fs, "writeFileSync").withArgs(match("allure-results")).returns(undefined);
  const { runConfiguration } = await loadConfiguration({
    provided: {
      paths: [join(cwd(), "test/fixtures/features")],
      format: [join(cwd(), "test/reporter.cjs")],
    },
  });
  const support = await loadSupport({
    ...runConfiguration,
    support: {
      ...runConfiguration.support,
      requirePaths: tests.map((test) => join(cwd(), "test/fixtures/support", `${test}.cjs`)),
    },
  });

  await runCucumber({
    ...runConfiguration,
    support,
  });

  restore();

  return writeFileSpy.args.reduce(
    (acc, [, rawResult]) => {
      const result = JSON.parse(rawResult as string) as TestResult;

      return Object.assign(acc, { [result.name!]: result });
    },
    {} as Record<string, TestResult>,
  );
};
