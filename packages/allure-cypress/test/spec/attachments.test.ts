import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCypressInlineTest } from "../utils";

test("text", async () => {
  const { tests, attachments } = await runCypressInlineTest(`
    import { attachment } from "allure-cypress";

    it("text attachment", () => {
      attachment("foo.txt", "bar", "text/plain");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachments[attachment.source] as string).toBe("bar");
});

test("json", async () => {
  const { tests, attachments } = await runCypressInlineTest(`
    import { attachment } from "allure-cypress";

    it("json attachment", () => {
      attachment("foo", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo");
  expect(JSON.parse(attachments[attachment.source] as string)).toEqual({
    foo: "bar",
  });
});

test("cypress read file", async () => {
  const { tests, attachments } = await runCypressInlineTest(
    `
      import { attachment } from "allure-cypress";

      it("json attachment", () => {
        cy.readFile("foo.txt", null).then((content) => {
          attachment("foo.txt", content, "text/plain")
        })
      });
    `,
    undefined,
    async (testDir) => {
      await writeFile(join(testDir, "foo.txt"), "bar", "utf8");
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachments[attachment.source] as string).toBe("bar");
});
