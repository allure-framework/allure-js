import { TestResult } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import { HermioneAllure } from "../types";

describe("hooks", () => {
  it("applies commands from `beforeEach` and `afterEach` for each test", async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/hooks.js"], {});

    const hasHookLabel = (result: TestResult, hook: string) => {
      return !!result.labels.find(({ name, value }) => name === "hook" && value === hook);
    };

    expect(
      hermione.allure.writer.results.every(
        (result) => hasHookLabel(result, "before") && hasHookLabel(result, "after"),
      ),
    ).eq(true);
  });
});
