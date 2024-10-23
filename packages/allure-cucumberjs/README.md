# allure-cucumberjs

> Allure integration for `cucumber-js` compatible with `@cucumber/cucumber@^8.x.x` and Allure 2+.

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

Intall `allure-cucumberjs` using a package manager of your choice. For example:

```shell
npm install -D allure-cucumberjs
```

> If you're a Yarn PnP user, please read [this](https://allurereport.org/docs/cucumberjs-configuration/#a-note-for-yarn-pnp-users).

## Usage

Enable the `allure-cucumberjs/reporter` formatter in the Cucumber.js configuration file. Optionally, provide [the configuration properties](https://allurereport.org/docs/cucumberjs-configuration/). Here is an example for `cucumber.json`:

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

When the test run completes, the result files will be generated in the `./allure-results` directory. If you want to use another location, provide it via the [`resultsDir`](https://allurereport.org/docs/cucumberjs-configuration/#resultsdir) configuration option.

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
import { Given } from "@cucumber/cucumber";
import * as allure from "allure-js-commons";

Given("my step", async () => {
  await allure.step("a substep", async () => {
    await allure.label("name", "value");
    await allure.tags("tag1", "tag2");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/1", "ISSUE-1");
    await allure.owner("eroshenkoam");
    await allure.layer("UI");
    await allure.description("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
    await allure.attachment("data.txt", "some data", "text/plain");
  });
});
```

## The documentation and examples

Learn more about Allure Cucumber.js from the official documentation at
[https://allurereport.org/docs/cucumberjs/](https://allurereport.org/docs/cucumberjs/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Acucumberjs).
