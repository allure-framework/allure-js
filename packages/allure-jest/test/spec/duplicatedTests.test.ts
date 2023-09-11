import { expect } from "chai";
import { runJestTests } from "../utils";

describe("tests with the same name", () => {
  it("throws an user-friendly error", async () => {
    try {
      await runJestTests(["./test/fixtures/duplicatedTests.test.js"]);
    } catch (err) {
      expect(err.message).eq(
        // eslint-disable-next-line @typescript-eslint/quotes
        'Test "has the same name" has been already added to run! To continue with reporting, please rename the test.',
      );
    }
  });
});
