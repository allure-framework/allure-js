import type { TestResult } from "allure-js-commons";
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

it("keeps retries in the same timeline lane and separates lanes across blobs", async () => {
  const { restFiles } = await runPlaywrightInlineTest(
    {
      "playwright.config.js": `
        module.exports = {
          fullyParallel: true,
          workers: 1,
          retries: 1,
          reporter: [
            ['./replay.cjs'],
            ['blob', { outputDir: 'blob-' + process.env.SHARD }],
          ],
        };
      `,
      "merge.config.js": `
        module.exports = { reporter: [['allure-playwright', { resultsDir: './replayed-results' }]] };
      `,
      "replay.cjs": `
        const { spawnSync } = require('node:child_process');
        const { copyFileSync, readdirSync, writeFileSync } = require('node:fs');
        module.exports = class {
          onExit() {
            if (process.env.SHARD !== '1') return;
            const env = { ...process.env, SHARD: '2' };
            delete env.ALLURE_TEST_MODE;
            delete env.ALLURE_THREAD_NAME;
            const run = (...args) => spawnSync(process.execPath, [
              require.resolve('@playwright/test/cli'), ...args,
            ], { env, encoding: 'utf8' });
            const shard = run('test', '--shard=2/2');
            writeFileSync('shard-log.txt', shard.stdout + shard.stderr);
            if (shard.status !== 0) return;
            for (const file of readdirSync('blob-2')) copyFileSync('blob-2/' + file, 'blob-1/' + file);
            const merged = run('merge-reports', '--config', './merge.config.js', './blob-1');
            writeFileSync('merge-log.txt', merged.stdout + merged.stderr);
            writeFileSync('merge-status.json', JSON.stringify(merged.status));
          }
        };
      `,
      "sample.test.js": `
        const { test, expect } = require('@playwright/test');
        test('first shard', ({}, testInfo) => {
          expect(testInfo.retry).toBe(1);
        });
        test('second shard', () => {});
      `,
    },
    ["--shard=1/2"],
    { SHARD: "1" },
  );

  expect(restFiles["merge-status.json"], restFiles["merge-log.txt"] ?? restFiles["shard-log.txt"]).toBe("0");
  expect(restFiles["merge-log.txt"]).not.toContain("Error in reporter");
  const results = Object.entries(restFiles)
    .filter(([name]) => name.endsWith("-result.json"))
    .map(([, content]): TestResult => JSON.parse(content));
  expect(results.map(({ name, status }) => [name, status]).sort()).toEqual([
    ["first shard", "failed"],
    ["first shard", "passed"],
    ["second shard", "passed"],
  ]);

  const lane = (result: TestResult) => result.labels.find(({ name }) => name === "thread")?.value;
  const [firstAttemptLane, retryLane] = results.filter(({ name }) => name === "first shard").map(lane);
  const peerLane = lane(results.find(({ name }) => name === "second shard")!);
  expect(firstAttemptLane).toEqual(expect.any(String));
  expect(peerLane).toEqual(expect.any(String));
  expect(retryLane, "retries in the same slot should share a lane").toBe(firstAttemptLane);
  expect(peerLane, "the same slot in another blob should have its own lane").not.toBe(firstAttemptLane);
});
