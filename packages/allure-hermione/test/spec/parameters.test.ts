import { expect } from "chai";
import { describe, it } from "mocha";
import { Parameter } from "allure-js-commons";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("parameters", () => {
  it("adds `foo` custom parameter", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/parameters.js"]);

    const { parameters } = getTestResultByName(results, "custom");
    const parameter = parameters.find(({ name }) => name === "foo") as Parameter;

    expect(parameter.name).eq("foo");
    expect(parameter.value).eq("bar");
    expect(parameter.excluded).eq(false);
    expect(parameter.mode).eq("hidden");
  });
});
