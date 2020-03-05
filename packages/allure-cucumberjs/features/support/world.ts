import { setWorldConstructor, World, Cli as CucumberCli } from "cucumber";
import { PassThrough } from "stream";
import VError from "verror";
import * as path from "path";
import glob from "glob";
import { TestResult } from "allure-js-commons";
import * as fs from "fs-extra";

interface AllureReport {
  testResults: TestResult[];
}

const getAllureReport: (reportPath: string) => AllureReport = reportPath => {
  const allureReport: AllureReport = { testResults: [] };
  const files = glob.sync(path.join(reportPath, "/*-result.json"));
  files.forEach(file => {
    const content = fs.readJSONSync(file);
    allureReport.testResults.push(content);
  });
  return allureReport;
};

class AllureWorld implements World, AllureWorld {
  tmpDir: string = "";
  formatterPath = "support/allure-formatter.ts";
  formatterOutPath = "../out/allure-results";
  allureReport: AllureReport = { testResults: [] };
  result: { stdout: string; stderr: string; error: string } = { stdout: "", stderr: "", error: "" };

  async run() {
    const formatterPath = path.join(this.tmpDir, this.formatterPath);
    const formatterOutPath = path.join(this.tmpDir, this.formatterOutPath);
    const argv = ["", "", "--backtrace", "--require-module=ts-node/register", `--format=${formatterPath}:.dummy.txt`];

    const cwd = this.tmpDir;

    let error;
    let stdout = "";
    let stderr = "";

    const stdoutStream = new PassThrough();

    stdoutStream.on("readable", () => {
      let chunk;
      while ((chunk = stdoutStream.read())) {
        stdout += Buffer.concat([chunk]).toString("utf8");
      }
    });

    const cucumberClient = new CucumberCli({ argv: argv, cwd: cwd, stdout: stdoutStream });

    try {
      const { success } = await cucumberClient.run();
      if (!success) {
        error = new Error("CLI exited with non-zero");
      }
    } catch (err) {
      error = err;
      stderr = VError.fullStack(error);
    }

    stdoutStream.end();

    this.allureReport = getAllureReport(formatterOutPath);
    this.result = { stdout, stderr, error };
  }
}

setWorldConstructor(AllureWorld);
