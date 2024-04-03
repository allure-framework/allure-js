
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("owner", async ({ currentTest }) => {
        await allure(currentTest).owner("foo");
      });
    