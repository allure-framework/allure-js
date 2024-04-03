
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("description", async ({ currentTest }) => {
        await allure(currentTest).description("foo");
      });
    