import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("description", () => {
  it("adds `foo` markdown description", async () => {
    const allureResults = await runHermione(["./test/fixtures/description.js"]);

    const { description } = getTestResultByName(allureResults.tests, "markdown description");
    expect(description).eq("foo");
  });

  it("adds `foo` html description", async () => {
    const allureResults = await runHermione(["./test/fixtures/description.js"]);

    const { descriptionHtml } = getTestResultByName(allureResults.tests, "html description");

    expect(descriptionHtml).eq("fooHtml");
  });
});
