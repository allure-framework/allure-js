// cjs: const { Glob } = require("glob");
// cjs: const path = require("path");
// cjs: const Mocha = require("mocha");
// cjs: const AllureReporter = require("allure-mocha");
// esm: import { Glob } from "glob";
// esm: import path from "path";
// esm: import { fileURLToPath } from "url";
// esm: import Mocha from "mocha";
// esm: import AllureReporter from "allure-mocha";

// cjs: const dirname = __dirname;
// esm: const dirname = path.dirname(fileURLToPath(import.meta.url));

let emitFiles = false;
let parallel = false;
const requires = [];
const reporterOptions = {};

const sepIndex = process.argv.indexOf("--");
const args = sepIndex === -1 ? [] : process.argv.splice(sepIndex);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--emit-files":
      emitFiles = true;
      break;
    case "--parallel":
      parallel = true;
      // cjs: require("./setupParallel.cjs");
      // esm: await import("./setupParallel.cjs");
      requires.push(path.join(dirname, "setupParallel.cjs"));
      break;
    case "--environment-info":
      reporterOptions.environmentInfo = JSON.parse(Buffer.from(args[++i], "base64url").toString());
      break;
    case "--categories":
      reporterOptions.categories = JSON.parse(Buffer.from(args[++i], "base64url").toString());
      break;
    case "--extra-reporters":
      reporterOptions.extraReporters = JSON.parse(Buffer.from(args[++i], "base64url").toString());
      break;
  }
}

if (!emitFiles) {
  reporterOptions.writer = "MessageWriter";
}

const mocha = new Mocha({
  reporter: AllureReporter,
  reporterOptions,
  parallel,
  require: requires,
  color: false,
});

const run = async () => {
  for await (const file of new Glob("./**/*.spec.*", {})) {
    mocha.addFile(path.resolve(file));
  }
  await mocha.loadFilesAsync();
  mocha.run((failures) => process.exit(failures));
};

run();
