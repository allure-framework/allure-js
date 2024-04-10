import { expect, it } from "vitest";
import { ContentType, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("single step", async () => {
  const { tests } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { label, step } from "${allureCommonsModulePath}";

    it("step", () => {
      step("foo", () => {
        label("foo", "bar");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo" }));
});

it("multiple steps", async () => {
  const { tests } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { label, step } from "${allureCommonsModulePath}";

    it("step", () => {
      step("foo", () => {
        label("foo", "1");
      });

      step("bar", () => {
        label("bar", "2");
      });

      step("baz", () => {
        label("baz", "3");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "1" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "bar", value: "2" }));
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "baz", value: "3" }));
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo" }));
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "bar" }));
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "baz" }));
});

it("nested steps", async () => {
  const { tests } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { label, step } from "${allureCommonsModulePath}";

    it("step", () => {
      step("foo", () => {
        step("bar", () => {
           step("baz", () => {
             label("foo", "bar");
           });
        });
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo" }));
  expect(tests[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps).toContainEqual(expect.objectContaining({ name: "bar" }));
  expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps[0].steps).toContainEqual(expect.objectContaining({ name: "baz" }));
});

it("step with attachments", async () => {
  const { tests, attachments } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { attachment, step } from "${allureCommonsModulePath}";

    it("text attachment", () => {
      step("foo", () => {
        attachment("foo.txt", "bar", "text/plain");
      })
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(0);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo" }));

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachments[attachment.source] as string).toBe("bar");
});

it("step with screenshot", async () => {
  const { tests, attachments } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { step } from "${allureCommonsModulePath}";

    it("manual", () => {
      step("foo", () => {
        cy.screenshot("foo");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(0);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo" }));

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachment.name).toBe("foo");
  expect(attachment.type).toBe(ContentType.PNG);
  expect(attachments).toHaveProperty(attachment.source);
});

it("step with cypress assertion error", async () => {
  const { tests } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { step } from "${allureCommonsModulePath}";

    it("step", () => {
      step("foo", () => {
        cy.wrap(1).should("eq", 2);
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo", status: Status.FAILED }));
});

it("step with unexpected error", async () => {
  const { tests } = await runCypressInlineTest((allureCommonsModulePath) => `
    import { step } from "${allureCommonsModulePath}";

    it("step", () => {
      step("foo", () => {
        throw new Error("foo");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "foo", status: Status.BROKEN }));
});
