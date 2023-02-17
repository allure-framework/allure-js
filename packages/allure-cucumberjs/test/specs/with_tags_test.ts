import os from "node:os";
import { LabelName } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import sinon from "sinon";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  withTags: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "@foo\n" +
          "Feature: a\n" +
          "\n" +
          "  @bar\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When do something\n" +
          "    Then get something\n",
        uri: "withTags.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > examples", () => {
  it("should create labels", async () => {
    sinon.stub(os, "hostname").returns("127.0.0.1");
    sinon.stub(process, "getuid").returns(123);

    const results = await runFeatures(dataSet.withTags);
    expect(results.tests).length(1);

    const language = results.tests[0].labels.find((label) => label.name === LabelName.LANGUAGE);
    const framework = results.tests[0].labels.find((label) => label.name === LabelName.FRAMEWORK);
    const feature = results.tests[0].labels.find((label) => label.name === LabelName.FEATURE);
    const suite = results.tests[0].labels.find((label) => label.name === LabelName.SUITE);
    const host = results.tests[0].labels.find((label) => label.name === LabelName.HOST);
    const thread = results.tests[0].labels.find((label) => label.name === LabelName.THREAD);
    const tags = results.tests[0].labels.filter((label) => label.name === LabelName.TAG);

    expect(language?.value).eq("javascript");
    expect(framework?.value).eq("cucumberjs");
    expect(feature?.value).eq("a");
    expect(suite?.value).eq("b");
    expect(host?.value).eq("127.0.0.1");
    expect(thread?.value).eq(process.pid.toString());
    expect(tags).length(2);
    expect(tags[0].value).eq("@foo");
    expect(tags[1].value).eq("@bar");
  });
});
