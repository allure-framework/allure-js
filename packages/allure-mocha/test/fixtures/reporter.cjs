/* eslint @typescript-eslint/no-require-imports: 0 */
/* eslint @typescript-eslint/no-var-requires: 0 */
/* eslint @typescript-eslint/no-unsafe-argument: 0 */
const MochaAllureReporter = require("allure-mocha");
const path = require("path");

class ProcessMessageAllureReporter extends MochaAllureReporter {
  constructor(runner, opts) {
    if (opts.reporterOptions?.emitFiles !== "true") {
      opts.reporterOptions = {
        writer: opts.parallel ? path.join(__dirname, "./AllureMochaParallelWriter.cjs") : "MessageWriter",
      };
    }
    super(runner, opts);
  }
}

module.exports = ProcessMessageAllureReporter;
