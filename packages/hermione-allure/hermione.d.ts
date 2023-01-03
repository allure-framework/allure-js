import * as Hermione from "hermione"
import * as Mocha from "mocha"

declare module "hermione" {
  export interface TestError extends Error {
    screenshot?: {
      base64: string;
    }
  }

  export interface TestResult {
    err?: TestError;
  }
}
