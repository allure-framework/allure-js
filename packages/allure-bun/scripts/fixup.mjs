import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dirname = fileURLToPath(new URL(".", import.meta.url));
const distPath = resolve(dirname, "../dist");

writeFileSync(
  join(distPath, "package.json"),
  JSON.stringify(
    {
      type: "module",
    },
    null,
    2,
  ),
  "utf8",
);