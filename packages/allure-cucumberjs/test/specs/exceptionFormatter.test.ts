import { expect } from "chai";
import { describe, it } from "mocha";
import { runCucumberTests } from "../utils";

describe("exception formatter", () => {
  it("formats error messages with given formatter function", async () => {
    const summary = await runCucumberTests(["exceptionFormatter"], {
      exceptionFormatter: (error) => `Formatted ${error.toLowerCase()}`,
    });
    const result = summary.results["scenario with exception inside"];

    expect(result.statusDetails.message).contains("Formatted error: error message");
  });
});
