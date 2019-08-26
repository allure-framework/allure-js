// Typescript does not handle re-exported values correctly
// https://github.com/microsoft/TypeScript/issues/12522
// We write a manual code here that represents the actual behavior of the standard.
// Based on the Babel output:
// https://babeljs.io/repl#?code_lz=KYDwDg9gTgLgBAbwIYBsUFcrAL5wGZQQC2cA5AHQD0AJgJYDOMl9UAxpQLISsAWSAgmkzAASsEixgUUkA
"use strict";

const reporter = require("./dist/MochaAllureReporter");

Object.defineProperty(exports, "__esModule", { value: true });
Object.defineProperty(module.exports, "allure", {
  get() {
    return reporter.allure;
  }
});
