const allure = require("../src/index.ts");
const path = require("path");
describe("assign currentTest in suiteStarted", () => {
  it("should assign currentTest", () => {
    const suite = { title: "suite title", ctx: { currentTest: "mockCurrentTest" } };
    const group = {
      startTest: jest.fn().mockReturnValue({
        addLabel: jest.fn(),
      }),
    };

    const context = {
      allureTestCache: new Map(),
      allureStepCache: new Map(),
      ensureAllureGroupCreated: () => group,
    };

    const testObject = { title: "mockTitle", file: "mockFile", parent: suite };
    const codecept_dir = "mockCodeceptDir";

    // Mock the path.relative method
    jest.spyOn(path, "relative").mockImplementation((from, to) => `mockRelativePath/${to}`);

    // @ts-ignore
    global.codecept_dir = codecept_dir;
    const instance = allure({ outputDir: "./output" });

    instance.createTest.call(context, testObject);

    // Assert the value of this.currentTest after the method call
    // @ts-ignore
    expect(context.currentTest).toEqual("mockCurrentTest");
  });
});
