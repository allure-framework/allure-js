import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOG_ROOT = path.join(ROOT_DIR, ".ci-logs");
const YARN_BIN = process.platform === "win32" ? "yarn.cmd" : "yarn";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const positionalArgs = argv.filter((arg) => arg !== "--dry-run");
const [action, suiteId] = positionalArgs;

const suites = new Map([
  ...createShardedSuites("cypress", 4, {
    compileFrom: ["allure-cypress"],
    workspace: "allure-cypress",
    browserHeavy: true,
  }),
  ...createShardedSuites("playwright", 2, {
    compileFrom: ["allure-playwright"],
    workspace: "allure-playwright",
    browserHeavy: true,
  }),
  [
    "vitest",
    {
      compileFrom: ["allure-vitest"],
      testCommands: [createVitestCommand("allure-vitest", { browserHeavy: true })],
    },
  ],
  [
    "mocha-a",
    {
      compileFrom: ["allure-mocha"],
      testCommands: [
        createWorkspaceScriptCommand("allure-mocha", "test:serial"),
        createWorkspaceScriptCommand("allure-mocha", "test:runner"),
      ],
    },
  ],
  [
    "mocha-b",
    {
      compileFrom: ["allure-mocha"],
      testCommands: [
        createWorkspaceScriptCommand("allure-mocha", "test:parallel"),
        createWorkspaceScriptCommand("allure-mocha", "test:runner-parallel"),
      ],
    },
  ],
  [
    "midweight",
    {
      compileFrom: [
        "allure-js-commons",
        "allure-bun",
        "allure-chai",
        "allure-jasmine",
        "allure-jest",
        "allure-cucumberjs",
        "allure-codeceptjs",
        "newman-reporter-allure",
      ],
      testCommands: [
        createWorkspaceScriptCommand("allure-js-commons", "test"),
        createWorkspaceScriptCommand("allure-bun", "test"),
        createWorkspaceScriptCommand("allure-chai", "test"),
        createWorkspaceScriptCommand("allure-cucumberjs", "test"),
        createWorkspaceScriptCommand("allure-jasmine", "test"),
        createWorkspaceScriptCommand("allure-jest", "test"),
        createWorkspaceScriptCommand("allure-codeceptjs", "test"),
        createWorkspaceScriptCommand("newman-reporter-allure", "test"),
      ],
    },
  ],
]);

async function main() {
  if (!action || !suiteId || !["compile", "test"].includes(action)) {
    exitWithUsage(1);
  }

  const suite = suites.get(suiteId);
  if (!suite) {
    console.error(`Unknown suite '${suiteId}'.`);
    exitWithUsage(1);
  }

  const logPath = path.join(LOG_ROOT, suiteId, `${action}.log`);
  const commands = action === "compile" ? [createCompileCommand(suite.compileFrom)] : suite.testCommands;

  if (!dryRun) {
    await mkdir(path.dirname(logPath), { recursive: true });
  }

  for (const command of commands) {
    await runCommand(command, logPath);
  }
}

function createShardedSuites(prefix, count, { compileFrom, workspace, browserHeavy }) {
  return Array.from({ length: count }, (_, index) => {
    const shardNumber = index + 1;
    const id = `${prefix}-${shardNumber}`;
    return [
      id,
      {
        compileFrom,
        testCommands: [
          createVitestCommand(workspace, {
            shard: `${shardNumber}/${count}`,
            browserHeavy,
          }),
        ],
      },
    ];
  });
}

function createCompileCommand(workspaces) {
  const fromPattern = workspaces.length === 1 ? workspaces[0] : `{${workspaces.join(",")}}`;

  return {
    label: `compile ${fromPattern}`,
    args: [
      "workspaces",
      "foreach",
      "-R",
      "-p",
      "--topological-dev",
      "-i",
      "-v",
      "--from",
      fromPattern,
      "run",
      "compile",
    ],
  };
}

function createVitestCommand(workspace, { shard, browserHeavy = false } = {}) {
  const args = ["workspace", workspace, "vitest", "run"];

  if (shard) {
    args.push("--shard", shard);
  }

  if (browserHeavy && process.platform === "win32") {
    args.push("--maxWorkers", "1");
  }

  return {
    label: `${workspace} vitest`,
    args,
  };
}

function createWorkspaceScriptCommand(workspace, scriptName) {
  return {
    label: `${workspace} ${scriptName}`,
    args: ["workspace", workspace, "run", scriptName],
  };
}

async function runCommand(command, logPath) {
  const yarnInvocation = createYarnInvocation(command.args);
  const printableCommand = formatCommand(yarnInvocation.printableArgs);

  if (dryRun) {
    console.log(`[dry-run] ${printableCommand}`);
    return;
  }

  const logStream = createWriteStream(logPath, { flags: "a" });
  logStream.write(`$ ${printableCommand}${os.EOL}`);

  await new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(yarnInvocation.command, yarnInvocation.args, {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const writeChunk = (stream, destination) => {
      stream.on("data", (chunk) => {
        destination.write(chunk);
        logStream.write(chunk);
      });
    };

    writeChunk(child.stdout, process.stdout);
    writeChunk(child.stderr, process.stderr);

    const finalize = (message, callback) => {
      if (settled) {
        return;
      }

      settled = true;
      logStream.end(`${message}${os.EOL}`, callback);
    };

    child.on("error", (error) => {
      finalize(`${os.EOL}[error] ${error.message}`, () => reject(error));
    });

    child.on("close", (code, signal) => {
      if (signal) {
        finalize(`${os.EOL}[signal] ${signal}`, () => {
          reject(new Error(`Command interrupted by signal ${signal}: ${command.label}`));
        });
        return;
      }

      finalize(`${os.EOL}[exit] ${code}`, () => {
        if (code !== 0) {
          reject(new Error(`Command failed with exit code ${code}: ${command.label}`));
          return;
        }

        resolve();
      });
    });
  });
}

function createYarnInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", YARN_BIN, ...args],
      printableArgs: [YARN_BIN, ...args],
    };
  }

  return {
    command: YARN_BIN,
    args,
    printableArgs: [YARN_BIN, ...args],
  };
}

function formatCommand(args) {
  return args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(" ");
}

function exitWithUsage(code) {
  console.error("Usage: node ./scripts/ci/run-suite.mjs <compile|test> <suite-id> [--dry-run]");
  console.error(`Available suites: ${Array.from(suites.keys()).join(", ")}`);
  process.exit(code);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
