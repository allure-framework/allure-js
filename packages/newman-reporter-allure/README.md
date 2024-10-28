# newman-reporter-allure

> A newman reporter for generating nice and clean report using Allure framework

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation and examples

The docs for Allure Newman are available at [https://allurereport.org/docs/newman/](https://allurereport.org/docs/newman/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Anewman).

## Installation

Install `newman-reporter-allure` using a package manager of your choice. For example:

```shell
npm install -D newman-reporter-allure
```

## Usage

Enable the `allure` reporter via the CLI:

```shell
$ newman run "<Collection>" -e "<Environment>" -r allure
```

You may combine `allure` with other reporters:

```shell
$ newman run "<Collection>" -e "<Environment>" -r cli,allure
```

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the reporter's behavior with [the configuration options](https://allurereport.org/docs/newman-configuration/).

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
// @allure.label.epic:Authorization
// @allure.label.feature:BearerAuthorization
// @allure.label.story:ValidBearerToken
// @allure.label.tag:api
// @allure.label.owner:eroshenkoam
pm.test("Test Authentication", function () {
  // ...
});
```

More details about the API are available at [https://allurereport.org/docs/newman-reference/](https://allurereport.org/docs/newman-reference/).
