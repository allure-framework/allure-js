/* eslint @typescript-eslint/no-unsafe-argument: 0 */
import typescriptPlugin from "@rollup/plugin-typescript";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";

const dirname = fileURLToPath(new URL(".", import.meta.url));

const createNodeEntry = (inputFile) => {
  const outputFileBase = inputFile.replace(/^src/, "dist");
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

  return [
    defineConfig({
      input: inputFile,
      output: {
        file: join(dirname, outputFileBase.replace(/\.ts$/, ".mjs")),
        format: "esm",
        exports: "named",
        sourcemap: true,
      },
      plugins: [
        typescriptPlugin({
          tsconfig: "./tsconfig.rollup.json",
        }),
      ],
      external,
    }),
    defineConfig({
      input: inputFile,
      output: {
        file: join(dirname, outputFileBase.replace(/\.ts$/, ".cjs")),
        format: "cjs",
        exports: "named",
        sourcemap: true,
      },
      plugins: [
        typescriptPlugin({
          tsconfig: "./tsconfig.rollup.json",
        }),
      ],
      external,
    }),
  ];
};

export default () => {
  return [
    createNodeEntry("src/index.ts"),
    createNodeEntry("src/setupAllureMochaParallel.ts"),
    createNodeEntry("src/legacy.ts"),
  ].flat();
};
