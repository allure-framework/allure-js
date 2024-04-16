// import { before, describe, it } from "mocha";
// import { LaunchSummary, runCucumberTests } from "../utils";
//
// describe("labels", () => {
//   let summary: LaunchSummary;
//
//   before(async () => {
//     summary = await runCucumberTests(["labels"], {
//       labels: [
//         {
//           pattern: [/@feature:(.*)/],
//           name: "feature",
//         },
//         {
//           pattern: [/@severity:(.*)/],
//           name: "severity",
//         },
//       ],
//     });
//   });
//
//   it("adds feature labels to child scenarios", () => {
//     const withoutLabels = summary.results["without labels"];
//     const withLabels = summary.results["with labels"];
//     const withRuntimeLabels = summary.results["with runtime labels"];
//
//     withoutLabels.labels.should.contain.something.like({
//       name: "severity",
//       value: "foo",
//     });
//     withLabels.labels.should.contain.something.like({
//       name: "severity",
//       value: "foo",
//     });
//     withRuntimeLabels.labels.should.contain.something.like({
//       name: "severity",
//       value: "foo",
//     });
//   });
//
//   it("uses scenario labels even inside rules", () => {
//     const withLabels = summary.results["with labels"];
//
//     withLabels.labels.should.contain.something.like({
//       name: "feature",
//       value: "foo",
//     });
//   });
//
//   it("adds labels assigned in steps defs", () => {
//     const withRuntimeLabels = summary.results["with runtime labels"];
//
//     withRuntimeLabels.labels.should.contain.something.like({
//       name: "label",
//       value: "value",
//     });
//   });
// });
import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/new/sdk";
import { runCucumberInlineTest } from "../utils";

it("handles label", async  () => {
  const { tests } = await runCucumberInlineTest(["labels"], ["labels"]);

  debugger
})
