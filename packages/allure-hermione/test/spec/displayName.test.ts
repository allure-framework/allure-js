import { expect } from "chai";
import { describe, it } from "mocha";
import { runHermione } from "../helper/run_helper";
import { getTestResultByName } from "../runner";

describe("displayName", () => {
  it("sets custom test name", async () => {
    const allureResults = await runHermione(["./test/fixtures/displayName.js"]);

    const { name, fullName } = getTestResultByName(allureResults.tests, "foo");

    expect(name).eq("foo");
    expect(fullName).eq("display name");
  });
});
