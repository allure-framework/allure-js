import { allure } from "./Setup";
import { Severity } from "allure2-js-commons";

describe("Suite interface", function() {
	it("Test description", function() {
		allure.setDescription("<h1>This is HTML description of test</h1>");
		expect(1).toEqual(1);
	});

	it("Test description HTML", function() {
		allure.setDescription("<h1>This is HTML description of test</h1>");
		expect(1).toEqual(1);
	});

	it("Test flaky", function() {
		allure.setFlaky();
		expect(1).toEqual(1);
	});

	it("Test known", function() {
		allure.setKnown();
		expect(1).toEqual(1);
	});

	it("Test muted", function() {
		allure.setMuted();
		expect(1).toEqual(2);
	});

	it("Test owner", function() {
		allure.addOwner("korobochka");
		expect(1).toEqual(1);
	});

	it("Test severity", function() {
		allure.setSeverity(Severity.CRITICAL);
		expect(1).toEqual(1);
	});

	it("Test issue", function() {
		allure.addIssue("ISSUE-12345");
		expect(1).toEqual(2);
	});

	it("Test tag", function() {
		allure.addTag("SMOKE");
		expect(1).toEqual(1);
	});

	it("Test testType", function() {
		allure.addTestType("smoke");
		expect(1).toEqual(1);
	});

	it("Test link", function() {
		allure.addLink("Yandex", "https://yandex.ru");
		expect(1).toEqual(1);
	});
});
