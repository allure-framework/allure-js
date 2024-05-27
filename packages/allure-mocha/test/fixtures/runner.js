// cjs: const Mocha = require("mocha");
// cjs: const AllureReporter = require("allure-mocha");
// cjs: const glob = require("glob");
// cjs: const path = require("path");
// esm: import Mocha from "mocha";
// esm: import AllureReporter from "allure-mocha";
// esm: import * as glob from "glob";
// esm: import path from "path";
// esm: import { fileURLToPath } from "url";

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
      requires.push(
        path.join(
          // esm: path.dirname(fileURLToPath(import.meta.url)),
          // cjs: __dirname,
          "setupParallel.cjs",
        ),
      );
      break;
    case "--require":
      requires.push(args[++i]);
      break;
  }
}

const mocha = new Mocha({
  reporter: AllureReporter,
  reporterOptions: {
    writer: emitFiles ? undefined : "MessageAllureWriter",
  },
  parallel,
  require: requires,
  color: false,
});

glob.sync("./**/*.spec.*").forEach((file) => {
  mocha.addFile(path.resolve(file));
});

mocha.loadFilesAsync().then(() => mocha.run());
