import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";
import {ContentType} from "allure-js-commons";

it("text", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { attachment } from "${allureCypressModulePath}";

    it("text attachment", () => {
      attachment("foo.txt", "bar", "text/plain");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachments[attachment.source] as string).toBe("bar");
});

it("json", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js":  ({ allureCypressModulePath }) => `
    import { attachment } from "${allureCypressModulePath}";

    it("json attachment", () => {
      attachment("foo", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo");
  expect(JSON.parse(attachments[attachment.source] as string)).toEqual({
    foo: "bar",
  });
});

it("cypress read file", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
      import { attachment } from "${allureCypressModulePath}";

      it("json attachment", () => {
        cy.readFile("foo.txt", null).then((content) => {
          attachment("foo.txt", content, "text/plain")
        })
      });
    `,
    "foo.txt": () => "bar",
});

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachments[attachment.source] as string).toBe("bar");
});

it("handles allure attachments inside cypress hooks", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { attachment } from "${allureCypressModulePath}";

    describe("suite", () => {
      beforeEach(() => {
        attachment("foo", JSON.stringify({ foo: "bar" }), "application/json");
      });

      afterEach(() => {
        attachment("bar", JSON.stringify({ foo: "bar" }), "application/json");
      });

      it("passed", () => {
        cy.wrap(1).should("eq", 1);
      });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(groups).toHaveLength(2);
  expect(groups).toEqual(expect.arrayContaining([
    expect.objectContaining({
      afters: [],
      befores: [
        expect.objectContaining({
          attachments: [expect.objectContaining({ name: "foo", type: ContentType.JSON })]
        })
      ],
    }),
    expect.objectContaining({
      afters: [
        expect.objectContaining({
          attachments: [expect.objectContaining({ name: "bar", type: ContentType.JSON })]
        })
      ],
      befores: [],
    }),
  ]))
})
