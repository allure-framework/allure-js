import { allure } from "./Setup";


function actions(name: string) {
	allure.step(name, function() {
		allure.step("Inner!", () => {
			//allure.setDescription("Step description!");
		});
	});
}

function actionsFail(name: string) {
	allure.step(name, function() {
		allure.step("Inner 1", () => {
			allure.step("Inner 2", () => {
				//allure.setDescription("Step description!");
			});
			throw new Error("Sad!");
		});
	});
}

describe("Suite with steps", function() {
	it("Test passed", function() {
		actions("Step 1");
		expect(1).toEqual(1);
		actions("Step 2");
	});

	it("Test failed", function() {
		actionsFail("Step 1");
		expect(1).toEqual(2);
		actionsFail("Step 2");
	});
});
