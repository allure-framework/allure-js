/*
"use strict";
const MAX_STRING_LEN = 1024;

export default class Logger {
	/**
	 * @param message {string}

	static info(message) {
		if (message.length > MAX_STRING_LEN) {
			Logger.attachJson("info", message);
			return;
		}
		try {
			allure._allure.startStep(message);
			allure._allure.endStep("passed");
		} catch (e) {
			//console.log("No spec yet");
		}
		console.log(new Date().toISOString(), message);
	}

	/**
	 *
	 * @param el {WebElement|ElementFinder}
	 * @return {Promise.<void>}

	static async debugElementInfo(el) {
		Logger.info(`Tag: ${await el.getTagName()}`);
		Logger.info(`Class: ${await el.getAttribute("class")}`);
	}
	/**
	 * @param message {string}

	static error(message) {
		if (message.length > MAX_STRING_LEN) {
			Logger.attachJson("error", message);
			return;
		}
		try {
			allure._allure.startStep(message);
			allure._allure.endStep("failed");
		} catch (e) {
			//console.log("No spec yet");
		}
		console.error(new Date().toISOString(), message);
	}

	/*static async screenshot(name = "Screenshot") {
		const png = await browser.takeScreenshot();
		try {
			allure.createStep("Taking screenshot", function() {
				allure.createAttachment(name, new Buffer(png, "base64"), "image/png");
			})();
		} catch (e) {
			//console.log("No spec yet");
		}
	}
	static consoleDeepColoredPrint(obj) {
		console.dir(obj, {
			depth: null,
			colors: true
		});
	}

	/**
	 * @param name {string}
	 * @param data {string|*}

	static attachJson(name, data) {
		let dataString = data;
		if (typeof dataString !== "string") dataString = JSON.stringify(dataString);
		try {
			allure.createStep(`Attaching JSON ${name}`, function() {
				allure.createAttachment(name, dataString, "application/json");
			})();
		} catch (e) {
			//console.log("No spec yet");
		}
	}

	/**
	 * For situations when we either don't want to put info into report. We just want to print the message in console
	 * @param message

	static consoleInfo(message) {
		console.info(message);
	}
}
*/
