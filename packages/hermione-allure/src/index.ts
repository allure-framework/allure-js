import Hermione, { Test } from "hermione";
import { AllureReportOptions } from "./model";
import { AllureHermioneReporter } from "./reporter";

const hermioneAllureReporter = (hermione: Hermione, opts?: AllureReportOptions) => {
  if (opts?.enabled === false) {
    return;
  }

  new AllureHermioneReporter(hermione, opts);
};

module.exports = hermioneAllureReporter;
