import { expect, it } from "vitest";

import { runCypressInlineTest } from "../../../utils.js";

it("writes metrics from suite hooks and tests", async () => {
  const { metrics = {} } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      import { metric } from "${allureCommonsModulePath}";

      before(() => metric("setup.size", 0));
      it("records a metric", () => metric("bundle.size", 1024));
    `,
  });

  expect(Object.values(metrics).flat()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ key: "setup.size", value: 0 }),
      expect.objectContaining({ key: "bundle.size", value: 1024 }),
    ]),
  );
  expect(Object.values(metrics).flat()).toHaveLength(2);
});
