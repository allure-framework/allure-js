import commonjsPlugin from "@rollup/plugin-commonjs";
import resolvePlugin from "@rollup/plugin-node-resolve";
import typescriptPlugin from "@rollup/plugin-typescript";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";

const dirname = fileURLToPath(new URL(".", import.meta.url));

const createNodeEntry = (inputFile) => {
  const outputFileBase = inputFile.replace(/^src/, "dist");
  const external = [
    "mocha",
    "node:os",
    "node:fs",
    "node:process",
    "allure-js-commons",
    "allure-js-commons/sdk/node",
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
  return [createNodeEntry("src/index.ts")].flat();
};
