# Allure Javascript Integrations

> Official Allure Framework integrations for JavaScript test runners and API tools.

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Overview

This repository contains the shared `allure-js-commons` module together with ready-to-use integrations for the most popular JavaScript testing tools. Each package writes `allure-results` files that can be rendered by Allure Report.

Allure adds a consistent reporting layer on top of your test runs:

- rich steps with nested structure
- attachments such as screenshots, logs, traces, and API payloads
- metadata including owners, severity, tags, links, epics, stories, and test case IDs
- history-aware results, retries, flaky analysis, categories, and environment details
- a shared runtime API from `allure-js-commons` so teams can keep the same reporting model across frameworks

## Basic installation

Install the integration package for your test framework:

```bash
npm install -D allure-playwright
```

Run your tests so the integration can produce `./allure-results`.

To view the report, choose one of the supported report generators:

- Allure Report 2 CLI: install it by following the [official installation guide](https://allurereport.org/docs/install/), then run `allure generate` and `allure open`
- Allure Report 3: install the official npm package with `npm install -D allure`, then run `npx allure generate` and `npx allure open`

## Supported versions and platforms

The packages in this repository are Node.js integrations and are intended to run anywhere the underlying framework supports Node.js, including Linux, macOS, and Windows.

This repository is currently validated in CI on:

- Node.js 20 and 22
- Ubuntu and Windows runners

Minimum supported framework versions by package:

- `allure-codeceptjs`: `codeceptjs >= 2.3.6`
- `allure-cucumberjs`: `@cucumber/cucumber >= 10.8.0`
- `allure-cypress`: `cypress >= 12.17.4`
- `allure-jasmine`: `jasmine >= 2.7.0`
- `allure-jest`: `jest`, `jest-circus`, and matching Jest environments `>= 24.8.0`
- `allure-mocha`: `mocha >= 6.2.0`
- `allure-playwright`: `@playwright/test >= 1.53.0`
- `allure-vitest`: `vitest >= 1.3.0`
- `newman-reporter-allure`: `newman >= 3.5.0`
- `allure-js-commons`: shared runtime and reporter SDK used to build integrations

## Generate a report

### Allure Report 2

After your tests generate `./allure-results`, create the HTML report with the classic CLI:

```bash
allure generate ./allure-results -o ./allure-report
allure open ./allure-report
```

### Allure Report 3

If you install the official `allure` npm package, you can generate and open the report with:

```bash
npx allure generate ./allure-results
npx allure open ./allure-report
```

## Supported frameworks

### CucumberJS

![npm](https://img.shields.io/npm/dm/allure-cucumberjs.svg) ![npm](https://img.shields.io/npm/v/allure-cucumberjs.svg)

[Read more](/packages/allure-cucumberjs/README.md)


### Vitest

![npm](https://img.shields.io/npm/dm/allure-vitest.svg) ![npm](https://img.shields.io/npm/v/allure-vitest.svg)

[Read more](/packages/allure-vitest/README.md)

### Jest

![npm](https://img.shields.io/npm/dm/allure-jest.svg) ![npm](https://img.shields.io/npm/v/allure-jest.svg)

[Read more](/packages/allure-jest/README.md)

### Jasmine

![npm](https://img.shields.io/npm/dm/allure-jasmine.svg) ![npm](https://img.shields.io/npm/v/allure-jasmine.svg)

[Read more](/packages/allure-jasmine/README.md)

### Mocha

![npm](https://img.shields.io/npm/dm/allure-mocha.svg) ![npm](https://img.shields.io/npm/v/allure-mocha.svg)

[Read more](/packages/allure-mocha/README.md)

### Playwright

![npm](https://img.shields.io/npm/dm/allure-playwright.svg) ![npm](https://img.shields.io/npm/v/allure-playwright.svg)

[Read more](/packages/allure-playwright/README.md)

### Cypress

![npm](https://img.shields.io/npm/dm/allure-cypress.svg) ![npm](https://img.shields.io/npm/v/allure-cypress.svg)

[Read more](/packages/allure-cypress/README.md)

### Newman

![npm](https://img.shields.io/npm/dm/newman-reporter-allure.svg) ![npm](https://img.shields.io/npm/v/newman-reporter-allure.svg)

[Read more](/packages/newman-reporter-allure/README.md)

### CodeceptJS

![npm](https://img.shields.io/npm/dm/allure-codeceptjs.svg) ![npm](https://img.shields.io/npm/v/allure-codeceptjs.svg)

[Read more](/packages/allure-codeceptjs/README.md)

## Development

### allure-js-commons

Runtime API and reporter SDK for JavaScript and TypeScript integrations.

![npm](https://img.shields.io/npm/dm/allure-js-commons.svg) ![npm](https://img.shields.io/npm/v/allure-js-commons.svg)

[Read more](/packages/allure-js-commons/README.md)
