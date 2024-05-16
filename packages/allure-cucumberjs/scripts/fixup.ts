const { mkdirSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const esmBuildPath = resolve(__dirname, "../dist/esm");
const cjsBuildPath = resolve(__dirname, "../dist/cjs");

try {
  mkdirSync(esmBuildPath, { recursive: true });
} catch (err) {}

try {
  mkdirSync(cjsBuildPath, { recursive: true });
} catch (err) {}

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
