import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../../utils";

describe("legacy test metadata api", () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      ["legacy", "description"],
      ["legacy", "descriptionHtml"],
      ["legacy", "labels", "owner"],
      ["legacy", "labels", "layer"],
      ["legacy", "labels", "severities", "blocker"],
      ["legacy", "labels", "severities", "critical"],
      ["legacy", "labels", "severities", "minor"],
      ["legacy", "labels", "severities", "normal"],
      ["legacy", "labels", "severities", "trivial"],
    ));
  });

  it("can set a test's description", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a description",
        description: "foo",
      }),
    );
  });

  it("can set a test's descriptionHtml", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a description in HTML",
        descriptionHtml: "foo",
      }),
    );
  });

  it("can set a test's owner", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with an owner",
        labels: expect.arrayContaining([
          {
            name: "owner",
            value: "foo",
          },
        ]),
      }),
    );
  });

  describe("for severity", () => {
    it("can make test a blocker", () => {
      expect(tests).toContainEqual(
        expect.objectContaining({
          name: "a blocker",
          labels: expect.arrayContaining([
            {
              name: "severity",
              value: "blocker",
            },
          ]),
        }),
      );
    });

    it("can make test critical", () => {
      expect(tests).toContainEqual(
        expect.objectContaining({
          name: "a critical test",
          labels: expect.arrayContaining([
            {
              name: "severity",
              value: "critical",
            },
          ]),
        }),
      );
    });

    it("can make test normal", () => {
      expect(tests).toContainEqual(
        expect.objectContaining({
          name: "a normal test",
          labels: expect.arrayContaining([
            {
              name: "severity",
              value: "normal",
            },
          ]),
        }),
      );
    });

    it("can make test minor", () => {
      expect(tests).toContainEqual(
        expect.objectContaining({
          name: "a minor test",
          labels: expect.arrayContaining([
            {
              name: "severity",
              value: "minor",
            },
          ]),
        }),
      );
    });

    it("can make test trivial", () => {
      expect(tests).toContainEqual(
        expect.objectContaining({
          name: "a trivial test",
          labels: expect.arrayContaining([
            {
              name: "severity",
              value: "trivial",
            },
          ]),
        }),
      );
    });
  });

  it("can set a test's layer", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with a layer",
        labels: expect.arrayContaining([
          {
            name: "layer",
            value: "foo",
          },
        ]),
      }),
    );
  });
});
