import fs from "fs";
import { cwd } from "process";
import { runCLI } from "@jest/core";
import type { Config } from "@jest/types";
import type { TestResult } from "allure-js-commons";
import { match, stub } from "sinon";

describe("labels", () => {
  const results: TestResult[] = [];

  beforeEach(async () => {
    const argv: Config.Argv = {
      config: require.resolve("../jest.config"),
      collectCoverage: false,
      verbose: false,
      silent: true,
      $0: "",
      _: ["./test/fixtures/labels.test.js"],
    };
    const writeFileSpy = stub(fs, "writeFileSync")
      .withArgs(match("allure-results"))
      .returns(undefined);

    await runCLI(argv, [cwd()]);

    writeFileSpy.args.forEach(([, rawResult]) => {
      results.push(JSON.parse(rawResult as string) as TestResult);
    });
  });

  it("do something", () => {
    const { labels } = results[0];

    labels.should.include.something.that.deep.equals({
      name: "foo",
      value: "bar",
    });
  });
});
