# allure-cucumberjs

> Allure integration for `cucumber-js` compatible with `@cucumber/cucumber@^8.x.x` and Allure 2+.

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation and examples

The docs for Allure Cucumber.js are available at
[https://allurereport.org/docs/cucumberjs/](https://allurereport.org/docs/cucumberjs/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Acucumberjs).

## Installation

Install `allure-cucumberjs` using a package manager of your choice. For example:

```shell
npm install -D allure-cucumberjs
```

> If you're a Yarn PnP user, please read [this](https://allurereport.org/docs/cucumberjs-configuration/#a-note-for-yarn-pnp-users).

## Usage

Enable the `allure-cucumberjs/reporter` formatter in [the Cucumber.js configuration file](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md):

```json
{
  "default": {
    "format": [
      "allure-cucumberjs/reporter"
    ]
  }
}
```

> Alternatively, you may specify the formatter via the CLI:
> ```shell
> npx cucumber-js --format allure-cucumberjs/reporter
> ```

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the formatter's behavior with [the configuration options](https://allurereport.org/docs/cucumberjs-configuration/).

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
import { When } from "@cucumber/cucumber";
import * as allure from "allure-js-commons";

Given("an active user", async function () {
  await allure.description("The test checks if an active user with a valid password can sign in to the app.");
  await allure.epic("Signing in");
  await allure.tags("signin", "ui", "positive");
  await allure.issue("https://github.com/allure-framework/allure-js/issues/1", "ISSUE-1");
  await allure.owner("eroshenkoam");
  await allure.parameter("browser", "chrome");

  this.user = await createAnActiveUserInDb();
});

When("they sign in with a valid password", async function () {
  await allure.step("Navigate to the sign in page", async () => {
    // ...
  });

  await allure.step("Fill the sign-in form", async (stepContext) => {
    await stepContext.parameter("login", this.user.login);
    await stepContext.parameter("password", this.user.password, "masked");

    // ...
  });

  await allure.step("Submit the form", async () => {
    // ...
    // const responseData = ...

    await allure.attachment("response", JSON.stringify(responseData), { contentType: "application/json" });
  });
});

// ...
```

More details about the API are available at [https://allurereport.org/docs/cucumberjs-reference/](https://allurereport.org/docs/cucumberjs-reference/).
