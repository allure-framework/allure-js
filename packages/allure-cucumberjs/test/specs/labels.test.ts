import { LabelName } from "allure-js-commons";
import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

// const dataSet: { [name: string]: ITestFormatterOptions } = {
//   withLabels: {
//     supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
//       Given("a step", () => {});
//     }),
//     sources: [
//       {
//         data:
//           "@severity:foo @feature:bar\n" +
//           "Feature: a\n" +
//           "\n" +
//           "  @severity:bar @feature:foo @foo\n" +
//           "  Scenario: b\n" +
//           "    Given a step\n" +
//           "    When do something\n" +
//           "    Then get something\n",
//         uri: "withIssueLink.feature",
//       },
//     ],
//   },
//   withLabelsAndRules: {
//     supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
//       Given("a step", () => {});
//     }),
//     sources: [
//       {
//         data:
//           "@severity:foo @feature:bar\n" +
//           "Feature: a\n" +
//           "\n" +
//           "  Rule: r\n" +
//           "\n" +
//           "    @severity:bar @feature:foo @foo\n" +
//           "    Scenario: b\n" +
//           "      Given a step\n" +
//           "      When do something\n" +
//           "      Then get something\n",
//         uri: "withIssueLink.feature",
//       },
//     ],
//   },
//   withFeatureWideLabels: {
//     supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
//       Given("a step", () => {});
//     }),
//     sources: [
//       {
//         data: [
//           "@severity:foo @feature:bar",
//           "Feature: a",
//           "\n",
//           "  Scenario: b",
//           "    Given a step",
//           "\n",
//           "  @foo:bar",
//           "  Scenario: c",
//           "    Given a step",
//         ].join("\n"),
//         uri: "withFeatureWideLabels.feature",
//       },
//     ],
//   },
// };

describe.skip("labels", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["labels"], {
      labels: [
        {
          pattern: [/@feature:(.*)/],
          name: "feature",
        },
        {
          pattern: [/@severity:(.*)/],
          name: "severity",
        },
        {
          pattern: [/@foo:(.*)/],
          name: "foo",
        },
      ],
    });
  });

  it("adds feature labels to child scenarios", () => {
    const result = summary.results.a;

    result.labels.should.contain.something.like({
      name: "severity",
      value: "foo",
    });
  });

  it("use scenario labels", () => {
    const result = summary.results.b;

    debugger;

    result.labels.should.contain.something.like({
      name: "severity",
      value: "bar",
    });
  });
  // it("should add labels", async () => {
  //   const results = await runFeatures(dataSet.withLabels, {
  //     labels: [
  //       {
  //         pattern: [/@feature:(.*)/],
  //         name: "feature",
  //       },
  //       {
  //         pattern: [/@severity:(.*)/],
  //         name: "severity",
  //       },
  //     ],
  //   });
  //   expect(results.tests).length(1);

  //   const { labels } = results.tests[0];
  //   const tags = labels.filter((label) => label.name === LabelName.TAG);
  //   const severityLabels = labels
  //     .filter((label) => label.name === LabelName.SEVERITY)
  //     .map(({ value }) => value);
  //   const featureLabels = labels
  //     .filter((label) => label.name === LabelName.FEATURE)
  //     .map(({ value }) => value);

  //   expect(tags).length(1);
  //   expect(severityLabels).contains("foo");
  //   expect(severityLabels).contains("bar");
  //   expect(featureLabels).contains("foo");
  //   expect(featureLabels).contains("bar");
  // });

  // it("should add labels when scenario is inside a rule", async () => {
  //   const results = await runFeatures(dataSet.withLabelsAndRules, {
  //     labels: [
  //       {
  //         pattern: [/@feature:(.*)/],
  //         name: "feature",
  //       },
  //       {
  //         pattern: [/@severity:(.*)/],
  //         name: "severity",
  //       },
  //     ],
  //   });
  //   expect(results.tests).length(1);

  //   const { labels } = results.tests[0];
  //   const tags = labels.filter((label) => label.name === LabelName.TAG);
  //   const severityLabels = labels
  //     .filter((label) => label.name === LabelName.SEVERITY)
  //     .map(({ value }) => value);
  //   const featureLabels = labels
  //     .filter((label) => label.name === LabelName.FEATURE)
  //     .map(({ value }) => value);

  //   expect(tags).length(1);
  //   expect(severityLabels).contains("foo");
  //   expect(severityLabels).contains("bar");
  //   expect(featureLabels).contains("foo");
  //   expect(featureLabels).contains("bar");
  // });

  // it("adds top level feature labels to all scenarios", async () => {
  //   const results = await runFeatures(dataSet.withFeatureWideLabels, {
  //     labels: [
  //       {
  //         pattern: [/@feature:(.*)/],
  //         name: "feature",
  //       },
  //       {
  //         pattern: [/@severity:(.*)/],
  //         name: "severity",
  //       },
  //       {
  //         pattern: [/@foo:(.*)/],
  //         name: "foo",
  //       },
  //     ],
  //   });

  //   results.tests[0].labels.should.include.something.that.deep.equals({
  //     name: "feature",
  //     value: "bar",
  //   });
  //   results.tests[0].labels.should.include.something.that.deep.equals({
  //     name: "severity",
  //     value: "foo",
  //   });
  //   results.tests[1].labels.should.include.something.that.deep.equals({
  //     name: "feature",
  //     value: "bar",
  //   });
  //   results.tests[1].labels.should.include.something.that.deep.equals({
  //     name: "severity",
  //     value: "foo",
  //   });
  // });
});
