const allure = require("../src/index.ts");

describe("assign currentTest in suiteStarted", () => {
  it("should assign currentTest", () => {
    // Mock the necessary dependencies and setup test data
    const suite = {
      tests: [{ name: "Test 1" }],
      ctx: {
        currentTest: "Current Test",
      },
    };

    const createTest = jest.fn();

    const instance = allure({ outputDir: "./output" });
    instance.createTest = createTest;

    instance.suiteStarted(suite);

    expect(instance.currentTest).toBe(suite.ctx.currentTest);
  });
});
