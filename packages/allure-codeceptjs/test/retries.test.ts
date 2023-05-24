const allurePlugin = require("../src/index.ts");
describe("handleRetries", () => {
  it("should handle retries if the test has retried", () => {
    // Mock the necessary dependencies and setup test data
    const test = {
      _currentRetry: 1,
      _retriedTest: {
        state: "failed",
        _retries: 2,
      },
    };

    const allureTestByCodeceptTest = jest.fn().mockReturnValue({
      endTest: jest.fn(),
    });
    const createTest = jest.fn();

    const instance = allurePlugin({ outputDir: "./output" });
    instance.allureTestByCodeceptTest = allureTestByCodeceptTest;
    instance.createTest = createTest;

    instance.testAfter(test);

    expect(allureTestByCodeceptTest).toHaveBeenCalledWith(test._retriedTest);
    expect(allureTestByCodeceptTest().endTest).toHaveBeenCalled();
    expect(createTest).toHaveBeenCalledWith(test._retriedTest);
  });

  it("should not handle retries if the test has not retried", () => {
    // Mock the necessary dependencies and setup test data
    const test = {
      _currentRetry: 0,
      _retriedTest: {},
    };

    const allureTestByCodeceptTest = jest.fn();
    const createTest = jest.fn();

    const instance = allurePlugin({ outputDir: "./output" });
    instance.allureTestByCodeceptTest = allureTestByCodeceptTest;
    instance.createTest = createTest;

    instance.testAfter(test);

    expect(createTest).not.toHaveBeenCalled();
  });
});
