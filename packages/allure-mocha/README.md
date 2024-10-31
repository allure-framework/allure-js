# allure-mocha

> Allure framewok integration for Mocha framework

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation and examples

The docs for Allure Mocha are available at [https://allurereport.org/docs/mocha/](https://allurereport.org/docs/mocha/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Amocha).

## Installation

Install `allure-mocha` using a package manager of your choice. For example:

```shell
npm install -D allure-mocha
```

## Usage

Enable the `allure-mocha` reporter. For example, in `.mocharc.json`:

```json
{
  "reporter": "allure-mocha"
};
```

Alternatively, use the CLI. For example:

```bash
npx mocha -R allure-mocha
```

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the reporter's behavior with [the configuration options](https://allurereport.org/docs/mocha-configuration/).

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

Enhance the report by utilizing the runtime API:

```js
import { describe, it } from "mocha";
import * as allure from "allure-js-commons";

describe("signing in with a password", () => {
  it("should sign in with a valid password", async () => {
    await allure.description("The test checks if an active user with a valid password can sign in to the app.");
    await allure.epic("Signing in");
    await allure.feature("Sign in with a password");
    await allure.story("As an active user, I want to successfully sign in using a valid password");
    await allure.tags("signin", "ui", "positive");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/1", "ISSUE-1");
    await allure.owner("eroshenkoam");
    await allure.parameter("browser", "chrome");

    const user = await allure.step("Prepare the user", async () => {
      return await createAnActiveUserInDb();
    });

    await allure.step("Make a sign-in attempt", async () => {
      await allure.step("Navigate to the sign in page", async () => {
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
});
```

More details about the API are available at [https://allurereport.org/docs/mocha-reference/](https://allurereport.org/docs/mocha-reference/).
