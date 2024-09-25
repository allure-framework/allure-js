import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("should support snapshot testing", async () => {
  const { tests } = await runJestInlineTest({
    "sample.spec.js": `
      it("test with snapshot", () => {
        expect("some other data").toMatchSnapshot();
      });
      afterEach(() => {
      });
    `,
    "__snapshots__/sample.spec.js.snap":
      "// Jest Snapshot v1, https://goo.gl/fbAQLP\n" +
      "\n" +
      // prettier-ignore
      "exports[`test with snapshot 1`] = `\"some data\"`;\n",
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult).toEqual(
    expect.objectContaining({
      name: "test with snapshot",
      status: Status.FAILED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining(`expect(received).toMatchSnapshot()

Snapshot name: \`test with snapshot 1\`

Snapshot: "some data"
Received: "some other data"`),
      }),
    }),
  );
});
