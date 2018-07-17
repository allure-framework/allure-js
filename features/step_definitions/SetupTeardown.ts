/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";


defineSupportCode(function(steps) {
	const named = { "tags": "@Named" };
	steps.Before(named, function setupTestCase() {});

	steps.After(named, function teardownTestCase() {});

	const unnamed = { "tags": "@Unnamed" };
	steps.Before(unnamed, function() {});

	steps.After(unnamed, function() {});
});
