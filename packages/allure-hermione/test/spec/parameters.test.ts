import { Parameter, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { runHermioneTests } from "../runner";

describe("parameters", () => {
  it("adds `foo` parameter", async () => {
    const results = await runHermioneTests(["./test/fixtures/parameter.js"]);
    const { parameters } = results[0];
    const parameter = parameters.find(({ name }) => name === "foo") as Parameter;

    expect(parameter.name).eq("foo");
    expect(parameter.value).eq("bar");
    expect(parameter.excluded).eq(false);
    expect(parameter.mode).eq("hidden");
  });
});
