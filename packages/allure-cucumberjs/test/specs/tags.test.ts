import { LabelName } from "allure-js-commons";
import { describe, it } from "mocha";
import { runCucumberTests } from "../utils";

describe("tags", () => {
  it("assigns unmatched tags as tags labels", async () => {
    const summary = await runCucumberTests(["tags"]);
    const { labels } = summary.results.a;

    labels.should.contain.something.like({
      value: "@foo",
      name: LabelName.TAG,
    });
    labels.should.contain.something.like({
      value: "@bar",
      name: LabelName.TAG,
    });
  });
});
