/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";


defineSupportCode(function(steps) {
	const named = { "tags": "@Named" };
	steps.After(named, function setupTestCase() {});

	steps.Before(named, function teardownTestCase() {});

	const unnamed = { "tags": "@Unnamed" };
	steps.After(unnamed, function() {});

	steps.Before(unnamed, function() {});
});
