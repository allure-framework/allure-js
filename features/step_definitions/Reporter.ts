import { CucumberJSAllureFormatter } from "../../src/CucumberJSAllureReporter";
import { AllureRuntime, AllureConfig } from "allure2-js-commons";

export default class Reporter extends CucumberJSAllureFormatter {
	constructor(options: any) {
		super(
			options,
			new AllureRuntime(new AllureConfig("./out/allure-results")),
			{
				labels: {
					issue: [/@bug_(.*)/],
					epic: [/@feature:(.*)/]
				},
				exceptionFormatter: function(message) {
					return message.replace(/after (\d+)ms/g, function(substr, ms) {
						return `after ${Math.round(Number.parseInt(ms) / 1000)}s`;
					});
				}
			}
		);
	}
}
