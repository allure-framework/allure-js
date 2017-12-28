import { AllureInterface, JasmineAllureReporter } from "../src/JasmineAllureReporter";
import { JasmineConsoleReporter } from "../src/JasmineConsoleReporter";
import { AllureRuntime, Status } from "allure2-js-commons";

const runtime = new AllureRuntime({ resultsDir: "./out/allure-results" });

jasmine.getEnv().addReporter(new JasmineConsoleReporter());

const reporter = new JasmineAllureReporter(runtime);
jasmine.getEnv().addReporter(reporter);

export const allure: AllureInterface = reporter.getInterface();


runtime.writeExecutorInfo({
	"name": "Jenkins",
	"type": "jenkins",
	"url": "http://example.org",
	"buildOrder": 13,
	"buildName": "allure-report_deploy#13",
	"buildUrl": "http://example.org/build#13",
	"reportUrl": "http://example.org/build#13/AllureReport",
	"reportName": "Demo allure report"
});

runtime.writeEnvironmentInfo({
	"a": "b",
	"PATH": "azazaz"
});

runtime.writeCategories([
	{
		"name": "Sad tests",
		"messageRegex": /.*Sad.*/,
		"matchedStatuses": [
			Status.FAILED
		]
	},
	{
		"name": "Infrastructure problems",
		"messageRegex": ".*RuntimeException.*",
		"matchedStatuses": [
			Status.BROKEN
		]
	},
	{
		"name": "Outdated tests",
		"messageRegex": ".*FileNotFound.*",
		"matchedStatuses": [
			Status.BROKEN
		]
	},
	{
		"name": "Regression",
		"messageRegex": ".*\\sException:.*",
		"matchedStatuses": [
			Status.BROKEN
		]
	}
]);
