# allure-mocha

> Allure framewok integration for Mocha framework

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

```bash
npm i allure-mocha mocha --save-dev
```

or via yarn:

```bash
yarn add allure-mocha mocha --dev
```

Note that it's recommended to add the following dependencies as well for better user experience:

- typescript
- mocha-typescript
- source-map-support

## Usage

Either add **allure-mocha** into **mocha.opts**:

```text
--reporter allure-mocha
```

Or pass the same value via commandline / scripts:

```bash
mocha -R allure-mocha
```

If you want to provide extra information, such as steps and attachments, import the `allure` object
into your code:

```javascript
const { epic } = require("allure-js-commons");

it("is a test", async () => {
  await epic("Some info");
});
```

### Parameters usage

```ts
const { parameter } = require("allure-js-commons");

it("is a test", async () => {
  await parameter("parameterName", "parameterValue");
});
```

The `parameter` method may also take the third argument with the `hidden` and `excluded` options:
`mode: "hidden" | "masked"` - `masked` replaces the value with `*` characters to secure sensitive data, and `hidden` hides the parameter from report.

`excluded: true` - excludes the parameter from the history.

```ts
import { parameter } from "allure-js-commons";

it("is a test", async () => {
  await parameter("parameterName", "parameterValue", {
    mode: "hidden",
    excluded: true,
  });
});
```

## Decorators Support

To make tests more readable and avoid explicit API calls, you may use a special
extension - [ts-test-decorators](https://github.com/sskorol/ts-test-decorators).

## Examples

[mocha-allure-example](https://github.com/vovsemenv/mocha-allure-example) - a minimal setup for using
Mocha with Allure.
