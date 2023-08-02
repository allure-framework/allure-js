// Typescript does not handle re-exported values correctly
// https://github.com/microsoft/TypeScript/issues/12522
// We write a manual code here that represents the actual behavior of the standard.
// Based on the Babel output:
// https://babeljs.io/repl#?code_lz=KYDwDg9gTgLgBAbwIYBsUFcrAL5wGZQQC2cA5AHQD0AJgJYDOMl9UAxpQLISsAWSAgmkzAASsEixgUUkA
"use strict";

const _MochaAllure = require("./dist/MochaAllure");
const _MochaAllureReporter = require("./dist/MochaAllureReporter");

Object.defineProperty(exports, "__esModule", {
  value: true,
});
Object.defineProperty(module.exports, "MochaAllure", {
  enumerable: true,
  get: function () {
    return _MochaAllure.MochaAllure;
  },
});
Object.defineProperty(module.exports, "allure", {
  enumerable: true,
  get: function () {
    return _MochaAllureReporter.allure;
  },
});
Object.defineProperty(module.exports, "allureGetter", {
  enumerable: true,
  get: function () {
    return _MochaAllureReporter.allureGetter;
  },
});
Object.defineProperty(module.exports, "MochaAllureReporter", {
  enumerable: true,
  get: function () {
    return _MochaAllureReporter.MochaAllureReporter;
  },
});
