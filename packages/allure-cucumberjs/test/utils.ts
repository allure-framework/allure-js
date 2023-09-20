import fs from "node:fs";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { loadConfiguration, loadSupport, runCucumber } from "@cucumber/cucumber/api";
import { TestResult } from "allure-js-commons";
import { match, restore, stub } from "sinon";
import { type CucumberJSAllureFormatterConfig } from "../src/CucumberJSAllureReporter";

export interface LaunchSummary {
  results: Record<string, TestResult>;
  attachments: Record<string, { content: string; encoding: string }>;
}

export const runCucumberTests = async (
  tests: string[],
  reporterConfig?: CucumberJSAllureFormatterConfig,
): Promise<LaunchSummary> => {
  const writeFileSpy = stub(fs, "writeFileSync")
    .withArgs(match("allure-results"))
    .returns(undefined);
  const { runConfiguration } = await loadConfiguration({
    provided: {
      parallel: 0,
      paths: tests.map((test) => join(cwd(), "test/fixtures/features", `${test}.feature`)),
      format: [join(cwd(), "test/reporter.cjs")],
      formatOptions: {
        ...reporterConfig,
      },
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

  const rawResults = [...writeFileSpy.args];

  restore();

  const results = rawResults
    .filter(([path]) => /result\.json$/.test(path as string))
    .reduce(
      (acc, [, rawResult]) => {
        const result = JSON.parse(rawResult as string) as TestResult;

        return Object.assign(acc, { [result.name!]: result });
      },
      {} as Record<string, TestResult>,
    );
  const attachments = rawResults
    .filter(([path]) => /attachment\.\S+$/.test(path as string))
    .reduce(
      (acc, [path, content, encoding]) =>
        Object.assign(acc, {
          [relative("allure-results", path as string)]: {
            content,
            encoding,
          },
        }),
      {} as Record<string, { content: string; encoding: string }>,
    );

  return {
    results,
    attachments,
  };
};
