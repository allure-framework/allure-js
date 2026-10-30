// cjs: const { describe, it, beforeEach, afterEach } = require("mocha");
// esm: import { describe, it, beforeEach, afterEach } from "mocha";
// cjs: const { attachment } = require("allure-js-commons");
// esm: import { attachment } from "allure-js-commons";

describe("outer", () => {
  for (const name of ["first", "last"]) {
    describe(name, () => {
      beforeEach("failing setup", () => {
        throw new Error(`${name} setup failed`);
      });

      afterEach("failure artifact", async () => {
        await attachment(`${name}.txt`, `artifact for ${name}`, "text/plain");
      });

      it(name, () => {});
    });
  }
});
