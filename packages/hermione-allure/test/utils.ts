import Hermione from "hermione";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { InMemoryAllureWriter } from "allure-js-commons";

export const runHermioneInlineTest = async (test: string) => {
  const testDir = join(__dirname, "fixtures", randomUUID());
  const testFilePath = join(testDir, "sample.test.js");

  await mkdir(testDir, { recursive: true });
  await writeFile(testFilePath, test, "utf8");

  const writer = new InMemoryAllureWriter();
  const hermione = new Hermione("./test/.hermione.conf.js");
  // eslint-disable-next-line
  const hermioneAllure = require("hermione-allure");

  hermioneAllure(hermione, {
    writer,
    links: [
      {
        type: "issue",
        urlTemplate: "https://example.org/issue/%s",
      },
      {
        type: "tms",
        urlTemplate: "https://example.org/task/%s",
      },
    ],
  });

  try {
    await hermione.run([testDir]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    await rm(testDir, { recursive: true });
  }

  return {
    tests: writer.tests,
    groups: writer.groups,
    attachments: writer.attachments,
  };
};
