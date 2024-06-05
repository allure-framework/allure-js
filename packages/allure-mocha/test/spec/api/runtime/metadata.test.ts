import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../utils.js";

describe("test metadata api", () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      "testDisplayName",
      "description",
      "descriptionHtml",
      ["labels", "owner"],
      ["labels", "layer"],
      ["labels", "severities", "blocker"],
      ["labels", "severities", "critical"],
      ["labels", "severities", "minor"],
      ["labels", "severities", "normal"],
      ["labels", "severities", "trivial"],
    ));
  });

  it("can change a test's name", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        fullName: expect.stringMatching(/a renamed test$/),
        name: "foo",
      }),
    );
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
