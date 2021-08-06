# allure-playwright

This project implements Allure integration with [Playwright Test](https://playwright.dev) framework.

## Installation

```bash
npm i -D @playwright/test allure-playwright
```
or via yarn:
```bash
yarn add @playwright/test allure-playwright --dev
```

## Usage

Either add **allure-playwright** into **playwright.config.ts**:

```js
{
  reporter: 'allure-playwright'
}
```

Or pass the same value via command line:

```bash
npx playwright test --reporter=line,allure-playwright
```

Specify location for allure results:

Mac / Linux
```bash
ALLURE_RESULTS_DIR=my-allure-results npx playwright test --reporter=line,allure-playwright
```

Windows
```bash
set ALLURE_RESULTS_DIR=my-allure-results
npx playwright test --reporter=line,allure-playwright
```
