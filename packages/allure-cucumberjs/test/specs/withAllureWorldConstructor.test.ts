import { Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { runCucumberTests } from "../utils";

describe("with allure world constructor", () => {
  it("allows to use customized allure world", async () => {
    const summary = await runCucumberTests(["withAllureWorldConstructor"]);

    expect(Object.keys(summary.results)).length(1);
    expect(summary.results.a.status).eq(Status.PASSED);
    expect(summary.results.a.statusDetails.message).eq(undefined);
  });
});
