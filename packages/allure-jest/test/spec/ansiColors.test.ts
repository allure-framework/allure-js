import { expect } from "chai";
import { runJestTests } from "../utils";

describe("ansiColors", () => {
  it("removes ansi colors from text errors", async () => {
    const results = await runJestTests(["./test/fixtures/ansiColors.test.js"]);
    const [result] = Object.values(results);

    expect(result.name).eq("hello");
    expect(result.statusDetails.message).not.to.contain("\x1b[");
    expect(result.statusDetails.trace).not.to.contain("\x1b[");
  });
});
