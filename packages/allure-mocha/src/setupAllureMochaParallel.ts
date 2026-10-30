import type * as Mocha from "mocha";
import { createRequire } from "node:module";

import { AllureMochaReporter } from "./AllureMochaReporter.js";

const localRequire = typeof require === "function" ? require : createRequire(import.meta.url);

// mocha 12 ships its CommonJS internals as .cjs; older versions use .js
const requireMochaInternal = (modulePath: string) => {
  let resolvedPath: string;
  try {
    resolvedPath = localRequire.resolve(`mocha/${modulePath}.cjs`);
  } catch {
    resolvedPath = localRequire.resolve(`mocha/${modulePath}.js`);
  }
  return localRequire(resolvedPath);
};

const ParallelBuffered = requireMochaInternal("lib/nodejs/reporters/parallel-buffered");

const originalCreateListeners: (runner: Mocha.Runner) => Mocha.reporters.Base =
  ParallelBuffered.prototype.createListeners;

ParallelBuffered.prototype.createListeners = function (runner: Mocha.Runner) {
  const result = originalCreateListeners.call(this, runner);
  new AllureMochaReporter(runner, this.options as Mocha.MochaOptions, true);
  return result;
};
