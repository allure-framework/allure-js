import type * as Mocha from "mocha";
// @ts-ignore
import { default as ParallelBuffered } from "mocha/lib/nodejs/reporters/parallel-buffered.js";
import { AllureMochaReporter } from "./AllureMochaReporter.js";

const originalCreateListeners: (runner: Mocha.Runner) => Mocha.reporters.Base =
  ParallelBuffered.prototype.createListeners;

ParallelBuffered.prototype.createListeners = function (runner: Mocha.Runner) {
  const result = originalCreateListeners.call(this, runner);
  new AllureMochaReporter(runner, this.options as Mocha.MochaOptions, true);
  return result;
};
