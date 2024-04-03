
      const { allure } = require("hermione-allure/dist/runtime.js");

      describe("hooks", () => {
        beforeEach(async ({ currentTest }) => {
          await allure(currentTest).label("hook", "before");
        });

        afterEach(async ({ currentTest }) => {
          await allure(currentTest).label("hook", "after");
        });

        it("first test", () => {});

        it("second test", () => {});

        it("third test", () => {});
      });
    