import { AllureInterface, JasmineAllureReporter } from "../src/JasmineAllureReporter";
import { JasmineConsoleReporter } from "../src/JasmineConsoleReporter";
import { AllureRuntime, Status } from "allure2-js-commons";
import { TestResult } from "allure2-js-commons";

const runtime = new AllureRuntime({
	resultsDir: "./out/allure-results",
	testMapper: (result: TestResult) => {
		if (result.status == Status.SKIPPED) result.fullName = `(WAS SKIPPED) ${result.fullName}`;
		return result;
	}
});

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
	"PATH": "azazaz",
	"APPDATA": "C:\\USERS\\test (x86)\\AppData",
	"PS1": "\\[\\0330;$MSYSTEM;${PWD//[^[:ascii:]]/?}\\007\\]",
	"TEST1": "\\usr\\bin"
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
