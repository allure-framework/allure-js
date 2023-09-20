import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("description", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["description"]);
  });

  it("uses feature description", async () => {
    const result = summary.results.a;

    expect(result.description).eq("Feature's description");
  });

  it("uses scenario description over feature's one", async () => {
    const result = summary.results.b;

    expect(result.description).eq("Scenario's description");
  });
});
