import expect from "expect";
import { runJestTests } from "../utils";

describe("ansiColors", () => {
  it("removes ansi colors from text errors", async () => {
    const results = await runJestTests(["./test/fixtures/ansiColors.test.js"]);
    const [result] = Object.values(results);

    expect(result.name).toBe("hello");
    expect(result.statusDetails.message).not.toContain("\x1b[");
    expect(result.statusDetails.trace).not.toContain("\x1b[");
  });
});
