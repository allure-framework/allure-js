# allure-codeceptjs

> Allure framework integration for CodeceptJS

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

Intall `allure-codeceptjs` using a package manager of your choice. For example:

```bash
npm install -D allure-codeceptjs
```

## Usage

Add the `allure` entry to the `plugins` section of the CodeceptJS config file, optionally with [the configuration properties](https://allurereport.org/docs/codeceptjs-configuration/). For instance, if the config file is `codecept.config.(js|ts)`, the configuration may look like this:

```js
module.exports.config = {
  plugins: {
    allure: {
      enabled: true,
      require: "allure-codeceptjs",
    },

    // other plugins...
  }
};
```

When the test run completes, the result files will be generated in the `./allure-results` directory. If you want to use another location, provide it via the [`resultsDir`](https://allurereport.org/docs/codeceptjs-configuration/#resultsdir) option.

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

Feature("login-feature");
Scenario("login-scenario1", async () => {
  await allure.step("step 1", async () => {
    await allure.label("name", "value");
    await allure.tags("tag1", "tag2");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/673", "ISSUE-673");
    await allure.owner("eroshenkoam");
    await allure.layer("UI");
    await allure.description("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    await allure.attachment("data.txt", "some data", "text/plain");
  });
});
```

## The documentation and examples

Learn more about Allure CodeceptJS from the official documentation at
[https://allurereport.org/docs/codeceptjs/](https://allurereport.org/docs/codeceptjs/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Acodeceptjs).
