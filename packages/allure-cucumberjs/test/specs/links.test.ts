import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("links", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["links"], {
      links: [
        {
          pattern: [/@issue=(.*)/],
          urlTemplate: "https://example.org/issues/%s",
          type: "issue",
        },
        {
          pattern: [/@tms=(.*)/],
          urlTemplate: "https://example.org/tasks/%s",
          type: "tms",
        },
      ],
    });
  });

  it("adds links according the defined pattern", async () => {
    const result = summary.results.a;

    result.links.should.contain.something.like({
      url: "https://example.org/issues/1",
      type: "issue",
    });
    result.links.should.contain.something.like({
      url: "https://example.org/tasks/2",
      type: "tms",
    });
  });

  it("adds links accorting the defined pattern for scenario inside a rule", () => {
    const result = summary.results.b;

    result.links.should.contain.something.like({
      url: "https://example.org/issues/3",
      type: "issue",
    });
    result.links.should.contain.something.like({
      url: "https://example.org/tasks/4",
      type: "tms",
    });
  });

  it("adds feature link to all child scenarios", () => {
    const { a, b } = summary.results;

    a.links.should.contain.something.like({
      url: "https://example.org/issues/0",
      type: "issue",
    });
    b.links.should.contain.something.like({
      url: "https://example.org/issues/0",
      type: "issue",
    });
  });
});
