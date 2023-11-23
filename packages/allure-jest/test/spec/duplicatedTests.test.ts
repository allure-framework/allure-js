import expect from "expect";
import { runJestTests } from "../utils";

describe("tests with the same name", () => {
  it("throws an user-friendly error", async () => {
    await expect(() => runJestTests(["./test/fixtures/duplicatedTests.test.js"])).rejects.toThrow(
      'Test "has the same name" has been already initialized! To continue with reporting, please rename the test.',
    );
  });
});
