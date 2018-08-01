# cucumberjs-allure2-reporter

Allure 2 reporter for Cucumber.JS framework
Compatible with Cucumber.JS 3+ and Allure 2+

NPM link: [cucumberjs-allure2-reporter](https://www.npmjs.com/package/cucumberjs-allure2-reporter)

### How to use
Create Reporter file:
```ecmascript 6
export default class Reporter extends CucumberJSAllureFormatter {
	constructor(options) {
		super(
			options,
			new AllureRuntime({ resultsDir: "./out/allure-results" }),
			{
				labels: {
					issue: [/@bug_(.*)/],
					epic: [/@feature:(.*)/]
				}
			}
		);
	}
}
```
This class MUST:
* Be a default export
* Extend `CucumberJSAllureFormatter`
* Take 1 argument in constructor and pass it to `super()` as first argument
* Second `super()` argument is `AllureRuntime` instance
* Third is a config, currently allows to map tags to Allure labels

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
var CucumberJSAllureFormatter = require("cucumberjs-allure2-reporter").CucumberJSAllureFormatter;
var AllureRuntime = require("cucumberjs-allure2-reporter").AllureRuntime;

function Reporter(options) {
	CucumberJSAllureFormatter.call(this,
		options,
		new AllureRuntime({ resultsDir: "./out/allure-results" }),
		{});
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
