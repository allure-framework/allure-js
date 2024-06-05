// cjs: const { opendir } = require("fs/promises");
// cjs: const path = require("path");
// cjs: const Mocha = require("mocha");
// cjs: const AllureReporter = require("allure-mocha");
// esm: import { opendir } from "fs/promises";
// esm: import path from "path";
// esm: import { fileURLToPath } from "url";
// esm: import Mocha from "mocha";
// esm: import AllureReporter from "allure-mocha";

// cjs: const dirname = __dirname;
// esm: const dirname = path.dirname(fileURLToPath(import.meta.url));

let emitFiles = false;
let parallel = false;
const requires = [];

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
    case "--require":
      requires.push(args[++i]);
      break;
  }
}

const mocha = new Mocha({
  reporter: AllureReporter,
  reporterOptions: {
    writer: emitFiles ? undefined : "MessageWriter",
  },
  parallel,
  require: requires,
  color: false,
});

const specFilePattern = /\.spec\./;

const loadSpecFiles = async () => {
  for await (const node of await opendir(dirname, { recursive: true })) {
    if (node.isFile() && specFilePattern.test(node.name)) {
      mocha.addFile(path.join(node.path ?? node.parentPath, node.name));
    }
  }
};

const run = async () => {
  await loadSpecFiles();
  await mocha.loadFilesAsync();
  mocha.run((failures) => process.exit(failures));
};

run();
