
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("layer", async ({ currentTest }) => {
        await allure(currentTest).layer("foo");
      });
    