import { beforeAll, describe, expect, it } from "vitest";
import type { TestResultContainer } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("containers", () => {
  let groups: TestResultContainer[];
  beforeAll(async () => {
    ({ groups } = await runMochaInlineTest(
      "plain-mocha/testInFileScope",
      "plain-mocha/testInSuite",
      "plain-mocha/testInTwoSuites",
    ));
  });

  it("are not emitted if no fixtures defined", () => {
    expect(groups).toHaveLength(0);
  });
});
