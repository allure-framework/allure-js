
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("feature", async ({ currentTest }) => {
        await allure(currentTest).feature("foo");
      });
    