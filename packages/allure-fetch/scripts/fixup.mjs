import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dirname = fileURLToPath(new URL(".", import.meta.url));
const esmBuildPath = resolve(dirname, "../dist/esm");
const cjsBuildPath = resolve(dirname, "../dist/cjs");

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
