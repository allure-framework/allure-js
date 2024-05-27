/* eslint @typescript-eslint/no-unsafe-argument: 0 */
import typescriptPlugin from "@rollup/plugin-typescript";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";

const outdir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "dist",
);
const external = [
  "mocha",
  "node:os",
  "node:fs",
  "node:path",
  "node:process",
  "node:worker_threads",
  "allure-js-commons",
  "allure-js-commons/sdk/node",
  "mocha/lib/nodejs/reporters/parallel-buffered.js",
];

const createEntryConfigs = (entry, { format = ["cjs", "esm"], exports = "default" } = {}) => {
  return (format instanceof Array ? format : [format]).map((f) => {
    const outext = f === "cjs" ? ".cjs" : ".mjs";
    return defineConfig({
      input: join("src", `${entry}.ts`),
      output: {
        file: join(outdir, `${entry}${outext}`),
        format: f,
        exports: exports,
        sourcemap: true,
      },
      plugins: [
        typescriptPlugin({
          tsconfig: "./tsconfig.rollup.json",
        }),
      ],
      external,
    });
  });
};

export default () => {
  return [
    createEntryConfigs("index", { format: "cjs" }),
    createEntryConfigs("index", { format: "esm", exports: "named" }),
    createEntryConfigs("legacy", { exports: "named" }),
    createEntryConfigs("setupAllureMochaParallel", { exports: "none" })
  ].flat();
};
