import { describe, it, beforeEach } from "mocha";
import { displayName } from "allure-js-commons/new";

describe("a suite with before", async () => {
  beforeEach("an initial name", async () => {
    await displayName("a new name");
  });

  it("a test affected by a renamed fixture", async () => {});
});
