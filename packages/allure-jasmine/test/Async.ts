import { allure } from "./Setup";
import { delay, delayFail } from "./helpers";


function actions(name: string) {
  return allure.step(name, async function() {
    await allure.step("Inner!", () => delay(100));
    await delay(100);
  });
}

function actionsFail(name: string) {
  return allure.step(name, async function() {
    await allure.step("Inner 1", () => delay(100));
    await allure.step("Inner 2 that will fail", async() => {
      await delayFail(100);
    });
    await delay(100);
  });
}

describe("Suite with asyncs", function() {
  it("Test passed", async function() {
    await actions("Step 1");
    expect(1).toEqual(1);
    await actions("Step 2");
  });

  it("Test failed", async function() {
    await actionsFail("Step 1");
    expect(1).toEqual(1);
    await actionsFail("Step 2");
  });


  // FIXME: steps fall into the next test
  /*it("Test with timeout", async function () {
		await actions("Step 1");
		expect(1).toEqual(1);
		console.log("This should not happen 1");
		await actions("Step 2");
		console.log("This should not happen 2");
	}, 150);*/
});

