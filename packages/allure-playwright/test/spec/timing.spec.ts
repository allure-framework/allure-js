import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it.each([false, true])("preserves blob execution timestamps (zero duration: %s)", async (zeroDuration) => {
  const { restFiles } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [['./replay.cjs'], ['blob', { outputDir: './blob-report' }]] };
    `,
    "merge.config.js": `
      module.exports = { reporter: [['list'], ['allure-playwright', { resultsDir: './replayed-results' }]] };
    `,
    "replay.cjs": `
      const { spawnSync } = require('node:child_process');
      const { writeFileSync } = require('node:fs');
      module.exports = class {
        onTestEnd(test, result) {
          ${zeroDuration ? "result.duration = 0;" : ""}
          writeFileSync('execution.json', JSON.stringify({
            start: result.startTime.getTime(), duration: result.duration,
          }));
        }
        onExit() {
          const env = { ...process.env };
          delete env.ALLURE_TEST_MODE;
          const result = spawnSync(process.execPath, [
            require.resolve('@playwright/test/cli'), 'merge-reports',
            '--config', './merge.config.js', './blob-report',
          ], { env, encoding: 'utf8' });
          writeFileSync('replay-log.txt', result.stdout + result.stderr);
          writeFileSync('replay-status.json', JSON.stringify({ status: result.status }));
        }
      };
    `,
    "sample.test.js": `
      const { test } = require('@playwright/test');
      test('sample', async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
      });
    `,
  });

  const execution = JSON.parse(restFiles["execution.json"]);
  const results = Object.entries(restFiles)
    .filter(([name]) => name.endsWith("-result.json"))
    .map(([, content]) => JSON.parse(content));

  expect(JSON.parse(restFiles["replay-status.json"]), restFiles["replay-log.txt"]).toEqual({ status: 0 });
  expect(restFiles["replay-log.txt"]).not.toContain("Error in reporter");
  expect(results, restFiles["replay-log.txt"]).toHaveLength(1);
  expect(results[0]).toMatchObject({
    name: "sample",
    status: "passed",
    start: execution.start,
    stop: execution.start + execution.duration,
  });
});
