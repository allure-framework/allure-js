# allure-codeceptjs

> Allure framework integration for CodeceptJS

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation and examples

The docs for Allure CodeceptJS are available at [https://allurereport.org/docs/codeceptjs/](https://allurereport.org/docs/codeceptjs/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Acodeceptjs).

## Installation

Install `allure-codeceptjs` using a package manager of your choice. For example:

```bash
npm install -D allure-codeceptjs
```

## Usage

Enable the `allure` plugin in [the CodeceptJS configuration file](https://codecept.io/configuration/):

```js
module.exports.config = {
  plugins: {
    allure: {
      enabled: true,
      require: "allure-codeceptjs",
    },

    // Other plugins...
  },

  // Other CodeceptJS options...
};
```

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the plugin's behavior with [the configuration options](https://allurereport.org/docs/codeceptjs-configuration/).

### View the report

> You need Allure Report to be installed on your machine to generate and open the report from the result files. See the [installation instructions](https://allurereport.org/docs/install/) on how to get it.

Generate Allure Report after the tests are executed:

```bash
allure generate ./allure-results -o ./allure-report
```

Open the generated report:

```bash
allure open ./allure-report
```

## Allure API

Enhance the report by utilizing the Allure API:

```js
import * as allure from "allure-js-commons";

Feature("Signing in with a password");
Scenario("Signing in with a correct password", async () => {
  await allure.description("The test checks if an active user with a valid password can sign in to the app.");
  await allure.epic("Signing in");
  await allure.tags("signin", "ui", "positive");
  await allure.issue("https://github.com/allure-framework/allure-js/issues/673", "ISSUE-673");
  await allure.owner("eroshenkoam");
  await allure.parameter("browser", "chrome");

  const user = await allure.step("Prepare the user", async () => {
    return await createAnActiveUserInDb();
  });

  await allure.step("Make a sign-in attempt", async () => {
    await allure.step("Navigate to the sign-in page", async () => {
      // ...
    });

    await allure.step("Fill the sign-in form", async (stepContext) => {
      await stepContext.parameter("login", user.login);
      await stepContext.parameter("password", user.password, "masked");

      // ...
    });

    await allure.step("Submit the form", async () => {
      // ...
      // const responseData = ...

      await allure.attachment("response", JSON.stringify(responseData), { contentType: "application/json" });
    });
  });

  await allure.step("Assert the signed-in state", async () => {
    // ...
  });
});
```

More details about the API are available at [https://allurereport.org/docs/codeceptjs-reference/](https://allurereport.org/docs/codeceptjs-reference/).
