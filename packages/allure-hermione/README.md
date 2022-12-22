# allure-hermione

Allure integration for `hermione@^5.x.x`.

## Installation

```shell
npm i --save-dev allure-hermione allure-js-commons  # or
yarn add -D allure-hermione allure-js-commons       # or
pnpm add -D allure-hermione allure-js-commons      
```

## Setup

Add `allure-hermione` field to `plugins` in your `.hermione.conf.js` file:

``` javascript
module.exports = {
  plugins: {
    "allure-hermione": {
      resultsDir: "./allure-results"
    }
  }
}
```

## Using allure commands

The plugin provides custom browser commands which allow to add additional info
inside your tests:

``` javascript
import { expect } from "chai"

it("my test", async ({ browser, currentTest }) => {
  await browser.url("https://www.example.org/");
	await browser.$("#btn").click()
  
  const screenshot = await browser.takeScreenshot()
  
  await browser.attach(currentTest.id(), screenshot, "image/png")
  await browser.epic(currentTest.id(), "my_epic")
  
	expect(browser.url).not.eq("https://www.startpage.com/")
});
```

Don't forget to pass current test id as first argument to command!
