import { CucumberJSAllureFormatter } from "../../src/CucumberJSAllureReporter";
import { AllureRuntime } from "allure2-js-commons";

export default class Reporter extends CucumberJSAllureFormatter {
	constructor(options: any) {
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
