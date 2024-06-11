/* eslint @typescript-eslint/no-unsafe-argument: 0 */
const AllureMochaReporter = require("allure-mocha");

class ProcessMessageAllureReporter extends AllureMochaReporter {
  constructor(runner, opts) {
    if (opts.reporterOptions?.emitFiles !== "true") {
      (opts.reporterOptions ??= {}).writer = "MessageWriter";
    }
    for (const key of ["environmentInfo", "categories"]) {
      if (typeof opts.reporterOptions?.[key] === "string") {
        opts.reporterOptions[key] = JSON.parse(
          Buffer.from(opts.reporterOptions[key], "base64Url").toString()
        );
      }
    }
    super(runner, opts);
  }
}

module.exports = ProcessMessageAllureReporter;
