# allure-chai

> Allure framework integration for Chai assertions

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Features

- records Chai assertions as Allure steps
- supports `expect`, `should`, and `assert` styles
- works through the sync runtime from `allure-js-commons`

## Installation

Install `allure-chai` together with a Chai-compatible Allure test runner integration, such as `allure-mocha`:

```shell
npm install -D allure-chai allure-mocha chai
```

## Supported versions and platforms

- `chai >= 4 < 7`
- Linux, macOS, and Windows wherever Chai and your test runner support Node.js
- this repository is validated in CI on Node.js 20 and 22

## Usage

Register `allureChai` with Chai before assertions run:

```js
import * as chai from "chai";
import { allureChai } from "allure-chai";

chai.use(allureChai);

const { expect } = chai;

expect(response.status).to.equal(200);
```

The assertion above creates a step similar to:

```text
expect(201).to.equal(200)
```

The package does not configure a test runner by itself. Use it together with an Allure adapter that provides the runtime, for example `allure-mocha`.
