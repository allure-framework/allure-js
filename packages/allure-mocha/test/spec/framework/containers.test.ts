import { TestResultContainer } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("containers", async () => {
  let groups: TestResultContainer[];
  beforeAll(async () => {
    ({ groups } = await runMochaInlineTest(
      "plain-mocha/testInFileScope",
      "plain-mocha/testInSuite",
      "plain-mocha/testInTwoSuites",
    ));
  });

  it("are not emitted if no fixtures defined", async () => {
    expect(groups).toHaveLength(0);
  });
});
