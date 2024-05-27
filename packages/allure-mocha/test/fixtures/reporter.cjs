/* eslint @typescript-eslint/no-unsafe-argument: 0 */
const MochaAllureReporter = require("allure-mocha");
const path = require("path");

class ProcessMessageAllureReporter extends MochaAllureReporter {
  constructor(runner, opts) {
    if (opts.reporterOptions?.emitFiles !== "true") {
      opts.reporterOptions = {
        writer: opts.parallel ? path.join(__dirname, "./AllureMochaParallelWriter.cjs") : "MessageAllureWriter",
      };
    }
    super(runner, opts);
  }
}

module.exports = ProcessMessageAllureReporter;
