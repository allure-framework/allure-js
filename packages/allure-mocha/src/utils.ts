import * as Mocha from "mocha";
import { StatusDetails } from "allure-js-commons/sdk/node";

export const errorToStatusDetails = (error: unknown): StatusDetails | undefined => {
  if (error instanceof Error) {
    return {
      message: error.message,
      trace: error.stack,
    };
  } else if (error instanceof String) {
    return { message: error.toString() };
  } else if (typeof error === "string") {
    return { message: error };
  }
};

export const getSuitesOfMochaTest = (test: Mocha.Test) => test.titlePath().slice(0, -1);
