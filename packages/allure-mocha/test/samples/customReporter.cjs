const Mocha = require("mocha");

class CustomReporter extends Mocha.reporters.Base {
  constructor(runner, opts) {
    super(runner, opts);
    runner.on("start", () => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(opts.reporterOptions));
    });
  }
}

module.exports = CustomReporter;
