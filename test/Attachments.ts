import { allure } from "./Setup";
import { ContentType } from "allure2-js-commons";

describe("Suite attachment", function() {
	it("Test attachment text", function() {
		expect(1).toEqual(1);
		allure.attachment("Test text", "this is a text attachment", ContentType.TEXT);
	});

	it("Test attachment json", function() {
		expect(1).toEqual(1);
		allure.attachment("Test json", "{ \"json\": true }", ContentType.JSON);
	});

	it("Test attachment in step", function() {
		expect(1).toEqual(1);
		allure.step("Step name", function() {
			allure.attachment("Test text", "this is a text attachment in step", ContentType.TEXT);
		});
	});
});
