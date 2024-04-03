
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("story", async ({ currentTest }) => {
        await allure(currentTest).story("foo");
      });
    