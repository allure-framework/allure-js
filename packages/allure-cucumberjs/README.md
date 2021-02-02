# allure-cucumberjs

Allure integration for Cucumber.JS framework

Compatible with Cucumber.JS 3+ and Allure 2+

### How to use
Create Reporter file:
```ecmascript 6
export default class Reporter extends CucumberJSAllureFormatter {
  constructor(options) {
    super(
      options,
      new AllureRuntime({ resultsDir: "./allure-results" }),
      {
        labels: {
          epic: [/@feature:(.*)/],
          severity: [/@severity:(.*)/]
        },
        links: {
          issue: {
            pattern: [/@issue=(.*)/],
            urlTemplate: "http://localhost:8080/issue/%s"
          },
          tms: {
            pattern: [/@tms=(.*)/],
            urlTemplate: "http://localhost:8080/tms/%s"
          }
        }
      }
    );
  }
}
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

#### Reporter without classes
If you can not use classes (ES6 or TypeScript), here is an example of Reporter.js file written in plain JS:
```javascript
const { CucumberJSAllureFormatter } = require("allure-cucumberjs");
const { AllureRuntime } = require("allure-cucumberjs");

function Reporter(options) {
  return new CucumberJSAllureFormatter(
    options,
    new AllureRuntime({ resultsDir: "./allure-results" }),
    {}
  );
}
Reporter.prototype = Object.create(CucumberJSAllureFormatter.prototype);
Reporter.prototype.constructor = Reporter;

exports.default = Reporter;
```

### API
Instance of AllureInterface will be added to World prototype.
You can use it for creating nested steps and adding info to the report. 

### Author

Ilya Korobitsyn <mail@korobochka.org>

#### Contributors

* Claudia Hardman <claudia.hardman@mattel.com>
* Max Di Maria <ciclids@gmail.com>
* Daniel Montesinos <damonpam@gmail.com>
