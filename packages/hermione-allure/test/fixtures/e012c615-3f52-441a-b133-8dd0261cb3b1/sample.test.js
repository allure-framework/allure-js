
      const { allure } = require("hermione-allure/dist/runtime.js");

      it("tms", async ({ currentTest }) => {
        await allure(currentTest).tms("https://example.org", "foo");
        await allure(currentTest).tms("1", "bar");
        await allure(currentTest).tms("2", "baz");
      });
    