import { CucumberJSAllureFormatter } from "../../src/CucumberJSAllureReporter";
import { AllureRuntime } from "allure-js-commons";

export default class Reporter extends CucumberJSAllureFormatter {
	constructor(options: any) {
		super(
			options,
			new AllureRuntime({ resultsDir: "./out/allure-results" }),
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

		const giw = this.getGlobalInfoWriter();
		giw.writeExecutorInfo({
			name: "Host 1",
			buildUrl: "example.com/1242"
		});
		giw.writeEnvironmentInfo();
	}
}
