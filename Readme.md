# cucumberjs-allure2-reporter

Allure 2 reporter for Cucumber.JS framework
Compatible with Cucumber.JS 3+ and Allure 2+

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

### API
Instance of AllureInterface will be added to World prototype.
You can use it for creating nested steps and adding info to the report. 

### Authors

Ilya Korobitsyn <mail@korobochka.org>
