
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("tag", async ({ currentTest }) => {
        await allure(currentTest).tag("foo");
      });
    