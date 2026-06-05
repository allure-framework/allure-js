import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dirname = fileURLToPath(new URL(".", import.meta.url));
const esmBuildPath = resolve(dirname, "../dist/esm");
const cjsBuildPath = resolve(dirname, "../dist/cjs");

try {
  mkdirSync(esmBuildPath, { recursive: true });
} catch {}

try {
  mkdirSync(cjsBuildPath, { recursive: true });
} catch {}

writeFileSync(
  join(esmBuildPath, "package.json"),
  JSON.stringify(
    {
      type: "module",
    },
    null,
    2,
  ),
  "utf8",
);
writeFileSync(
  join(cjsBuildPath, "package.json"),
  JSON.stringify(
    {
      type: "commonjs",
    },
    null,
    2,
  ),
  "utf8",
);

// Make the CJS entry callable as a function when loaded by TestCafe via
// the string-name mechanism (require('testcafe-reporter-allure-official')).
// Babel's add-module-exports plugin skips the fixup when named exports exist,
// so we apply it explicitly here and also preserve named exports as properties.
const cjsIndexPath = join(cjsBuildPath, "index.js");
const cjsIndex = readFileSync(cjsIndexPath, "utf8");
writeFileSync(
  cjsIndexPath,
  cjsIndex +
    '\nmodule.exports = exports["default"];\n' +
    "Object.assign(module.exports, exports);\n",
  "utf8",
);
