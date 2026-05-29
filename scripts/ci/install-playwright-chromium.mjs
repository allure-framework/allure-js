import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import os from "node:os";
import process from "node:process";

const YARN_BIN = process.platform === "win32" ? "yarn.cmd" : "yarn";
const flags = process.argv.slice(2);
const installArgs = ["workspace", "allure-playwright", "playwright", "install", "chromium"];

if (flags.includes("--with-deps")) {
  installArgs.push("--with-deps");
}

const runYarn = (args, options = {}) => {
  const yarnInvocation = createYarnInvocation(args);
  const result = spawnSync(yarnInvocation.command, yarnInvocation.args, {
    stdio: options.captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: yarn ${args.join(" ")}`);
  }

  return result.stdout?.trim() ?? "";
};

function createYarnInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", YARN_BIN, ...args],
    };
  }

  return {
    command: YARN_BIN,
    args,
  };
}

runYarn(installArgs);

const executablePath = runYarn(
  [
    "workspace",
    "allure-playwright",
    "exec",
    "node",
    "-e",
    'const { chromium } = require("@playwright/test"); process.stdout.write(chromium.executablePath());',
  ],
  { captureOutput: true },
);

if (!executablePath) {
  throw new Error("Failed to resolve Chromium executable path.");
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `path=${executablePath}${os.EOL}`, "utf8");
}

console.log(`Playwright Chromium path: ${executablePath}`);
