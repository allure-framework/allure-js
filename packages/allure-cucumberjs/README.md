# allure-cucumberjs

Allure integration for Cucumber.JS framework

Compatible with Cucumber.JS 3+ and Allure 2+

## How to use the formatter

Create Reporter file:
```javascript
class Reporter extends CucumberJSAllureFormatter {
  constructor(options) {
    super(
      options,
      new AllureRuntime({ resultsDir: "./allure-results" }),
      {
        labels: {
          epic: [/@feature:(.*)/],
          severity: [/@severity:(.*)/]
        },
        links: [
          {
            pattern: [/@issue=(.*)/],
            type: "issue",
            urlTemplate: "http://localhost:8080/issue/%s"
          },
          {
            pattern: [/@tms=(.*)/],
            type: "tms",
            urlTemplate: "http://localhost:8080/tms/%s"
          }
        ]
      }
    );
  }
}

// cjs
module.exports = Reporter

// esm
export default Reporter
```
This class **MUST**:
* Be a default export.
* Extend `CucumberJSAllureFormatter`.
* First `super()` argument is the first argument in the `constructor`.
* Second `super()` argument is an `AllureRuntime` instance.
* Third argument is a config object which allows:
  * Map tags to Allure labels.
  * Add links to external sites like JIRA, XRAY, etc. `%s` will be auto-replaced by the issue id. Example:
```gherkin
@issue=TEST-1
Scenario: Example for scenario issue link check
Then the issue link should be "http://localhost:8080/issue/TEST-1"
```

Then pass with reporter as a Cucumber formatter:
```
node cucumber.js --format ./path/to/Reporter.js
```
If you want to retain default formatter add some dummy file as output:
```
node cucumber.js --format ./path/to/Reporter.js:./dummy.txt
```

## How to use filter

Filter function provided by the package allows to use re-run feature.

To use it, create `cucumber.js` config file with following content:

```javascript
// cjs
const path = require('path')
const { createTestPlanFilter } = require('allure-cucumberjs')

module.exports = {
	default: createTestPlanFilter({
		parallel: 4,
		format: [path.resolve(__dirname, './reporter.js')],
	})
}

// esm
import path from 'path'
import { createTestPlanFilter } from 'allure-cucumberjs'

export default createTestPlanFilter({
	parallel: 4,
	format: [path.resolve(__dirname, './reporter.js')],
})
```

Then, add `cucumber-js` with the config:

```javascript
cucumber-js --config ./cucumber.js
```

If the script has been triggered via re-run action – the filter processes only files described in test plan.

## Nested steps

You can use `AllureInterface` in the `World` prototype for creating nested steps and adding info to the report. 

## Author

Ilya Korobitsyn <mail@korobochka.org>

### Contributors

* Claudia Hardman <claudia.hardman@mattel.com>
* Max Di Maria <ciclids@gmail.com>
* Daniel Montesinos <damonpam@gmail.com>
