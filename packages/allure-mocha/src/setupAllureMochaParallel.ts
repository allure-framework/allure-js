import * as Mocha from "mocha";
// @ts-ignore
import { default as ParallelBuffered } from "mocha/lib/nodejs/reporters/parallel-buffered.js";
import { MochaAllureReporter } from "./reporter.js";

const originalCreateListeners: (runner: Mocha.Runner) => Mocha.reporters.Base =
  ParallelBuffered.prototype.createListeners;

ParallelBuffered.prototype.createListeners = function (runner: Mocha.Runner) {
  new MochaAllureReporter(runner, this.options as Mocha.MochaOptions);
  return originalCreateListeners.call(this, runner);
};
