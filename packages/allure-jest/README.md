# allure-jest

> Allure framework integration for Jest

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

> **Warning**
> This package only works with the [`jest-circus`](https://www.npmjs.com/package/jest-circus) test runner for Jest. It's the default runner for Jest starting from 27.0.0. If you use `jest@<27.0.0`, you should install `jest-circus` manually and set the [`testRunner`](https://jestjs.io/docs/configuration#testrunner-string) Jest option to `"jest-circus/runner"`.
> If you're a [`jest-jasmine2`](https://www.npmjs.com/package/jest-jasmine2) user, consider switching to `jest-circus`. If that's not an option for you, please use [allure-jasmine](https://allurereport.org/docs/jasmine/) instead.

## The documentation and examples

The docs for Allure Jest are available at [https://allurereport.org/docs/jest/](https://allurereport.org/docs/jest/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Ajest).

## Features

- writes Allure results from the Jest Circus runtime
- supports labels, links, parameters, nested steps, and attachments through `allure-js-commons`
- works with Allure Report 2 and Allure Report 3

## Installation

Install `allure-jest` using a package manager of your choice. For example:

```shell
npm install -D allure-jest
```

> If you're a **Yarn PnP** user, you must also explicitly install the Jest environment package and `allure-js-commons`. For example:
>
> ```shell
> yarn add --dev jest-environment-node allure-js-commons
> ```
>
> Keep in mind, that `allure-js-commons` and `allure-jest` must have the same version. The same goes for all Jest packages (`jest`, `jest-circus`, `jest-environment-node`, etc). Use [`yarn info`](https://yarnpkg.com/cli/info) to check the versions.

Install Allure Report separately when you want to render the generated `allure-results`:

- follow the [Allure Report 2 installation guide](https://allurereport.org/docs/install/) to use the `allure` CLI
- or install Allure Report 3 with `npm install -D allure` to use `npx allure`

## Supported versions and platforms

- `jest >= 24.8.0`
- `jest-circus >= 24.8.0`
- matching Jest CLI and environment packages `>= 24.8.0`
- Linux, macOS, and Windows wherever Jest supports Node.js
- this repository is validated in CI on Node.js 20 and 22

## Usage

Set the [`testEnvironment`](https://jestjs.io/docs/configuration#testenvironment-string) Jest option according to your needs:

- If you need access to DOM, set it to `"allure-jest/jsdom"` (make sure [jest-environment-jsdom](https://www.npmjs.com/package/jest-environment-jsdom) is installed).
- If you don't need access to DOM, set it to `"allure-jest/node"`.

Example:

```js
const config = {
  testEnvironment: "allure-jest/jsdom",
};

export default config;
```

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the behavior of Allure Jest with [the configuration options](https://allurereport.org/docs/jest-configuration/).

### View the report

Use Allure Report 2:

```bash
allure generate ./allure-results -o ./allure-report
allure open ./allure-report
```

Or use Allure Report 3:

```bash
npx allure generate ./allure-results
npx allure open ./allure-report
```

## Allure API

Enhance the report by utilizing the runtime API:

```js
import * as allure from "allure-js-commons";

describe("signing in with a password", () => {
  it("should sign in with a valid password", async () => {
    await allure.description("The test checks if an active user with a valid password can sign in to the app.");
    await allure.epic("Signing in");
    await allure.feature("Sign in with a password");
    await allure.story("As an active user, I want to successfully sign in using a valid password");
    await allure.tags("signin", "ui", "positive");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/4", "ISSUE-4");
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

More details about the API are available at [https://allurereport.org/docs/jest-reference/](https://allurereport.org/docs/jest-reference/).

## Using Allure-Jest with custom environment

To use Allure-Jest with custom environments, you can use the `createJestEnvironment` helper function:

```js
import CustomTestEnvironment from "jest-environment-custom";
import { createJestEnvironment } from "allure-jest/factory";

export default createJestEnvironment(CustomTestEnvironment);
```
