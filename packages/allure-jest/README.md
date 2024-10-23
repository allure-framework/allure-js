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
> This package only works with the [`jest-circus`](https://www.npmjs.com/package/jest-circus) test runner for Jest. That's the default for Jest since 27.0.0. If you use `jest@<27.0.0`, you should install `jest-circus` manually and set the [`testRunner`](https://jestjs.io/docs/configuration#testrunner-string) Jest option to `"jest-circus/runner"`.
> If you're a [`jest-jasmine2`](https://www.npmjs.com/package/jest-jasmine2) user, consider switching to `jest-circus`. If that's not an option for you, please use [allure-jasmine](https://allurereport.org/docs/jasmine/) instead.


## Installation

Intall `allure-jest` using a package manager of your choice. For example:

```shell
npm install -D allure-jest
```

> If you're a Yarn PnP user, you should also explicitly install the environment package you use and the `allure-js-commons` package to access [the Runtime API](#allure-runtime-api). For example:
> ```shell
> yarn add --dev jest-environment-node allure-js-commons
> ```

## Usage

If you're using `jest` for testing `node` add following line to your `jest.config.js` file:

Set the [`testEnvironment`](https://jestjs.io/docs/configuration#testenvironment-string) Jest option according to your needs:

  - If you need access to DOM, set it to `"allure-jest/jsdom"` (make sure [jest-environment-jsdom](https://www.npmjs.com/package/jest-environment-jsdom) is installed).
  - If you don't need access to DOM, set it to `"allure-jest/node"`.

Example:

```diff
const config = {
  testEnvironment: "allure-jest/jsdom",
};

export default config;
```

To configure Allure Jest, pass [the configuration properties](https://allurereport.org/docs/jest-configuration/) via [`testEnvironmentOptions`](https://jestjs.io/docs/configuration#testenvironmentoptions-object).

### View the report

> You need Allure Report to generate and open the report from the result files. See the [installation instructions](https://allurereport.org/docs/install/) for more details.

Generate Allure Report after the tests are executed:

```bash
allure generate ./allure-results -o ./allure-report
```

Open the generated report:

```bash
allure open ./allure-report
```

## Allure Runtime API

Enhance the report by utilizing the runtime API:

```js
import * as allure from "allure-js-commons";

it("my test", async () => {
  await allure.step("a step", async () => {
    await allure.label("name", "value");
    await allure.tags("tag1", "tag2");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/4", "ISSUE-4");
    await allure.owner("eroshenkoam");
    await allure.layer("UI");
    await allure.description("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    await allure.attachment("data.txt", "some data", "text/plain");
  });
});
```

## The documentation and examples

Learn more about Allure Jest from the official documentation at
[https://allurereport.org/docs/jest/](https://allurereport.org/docs/jest/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Ajest).
