
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("description html", async ({ currentTest }) => {
        await allure(currentTest).descriptionHtml("foo");
      });
    