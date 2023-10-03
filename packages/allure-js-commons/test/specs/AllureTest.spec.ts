import process from "process";
import { expect } from "chai";
import { restore, stub } from "sinon";
import { AllureRuntime, AllureTest } from "allure-js-commons";

const fixtures = {
  name: "test name",
  runtimeWriter: {
    writeResult: stub(),
    writeGroup: stub(),
    writeAttachment: stub(),
    writeAttachmentFromPath: stub(),
    writeEnvironmentInfo: stub(),
    writeCategoriesDefinitions: stub(),
  },
};

describe("AllureTest", () => {
  let runtime: AllureRuntime;

  beforeEach(() => {
    restore();

    stub(process, "env").value({
      ALLURE_LABEL_FOO: "foo",
      ALLURE_LABEL_BAR: "bar",
    });

    runtime = new AllureRuntime({
      writer: fixtures.runtimeWriter,
      resultsDir: "",
    });
  });

  it("assigns global allure labels from env variables to the test", () => {
    const currentTest = new AllureTest(runtime);

    currentTest.endTest();

    expect(fixtures.runtimeWriter.writeResult.args[0][0].labels).eql([
      {
        name: "foo",
        value: "foo",
      },
      {
        name: "bar",
        value: "bar",
      },
    ]);
  });
});
