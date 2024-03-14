import commonjsPlugin from "@rollup/plugin-commonjs";
import resolvePlugin from "@rollup/plugin-node-resolve";
import typescriptPlugin from "@rollup/plugin-typescript";
import { glob } from "glob";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";

const dirname = fileURLToPath(new URL(".", import.meta.url));
const external = ["md5", "strip-ansi", "fs", "fs/promises", "path", "process", "properties", "crypto"];

const createRollupEntry = (inputFile) => {
  const outputFileBase = `dist/${inputFile}`;

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
        resolvePlugin(),
        commonjsPlugin(),
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
        resolvePlugin(),
        commonjsPlugin(),
      ],
      external,
    }),
  ];
};

export default () => {
  return [
    createRollupEntry("index.ts"),
    createRollupEntry("internal.ts"),
    createRollupEntry("src/new/index.ts"),
    createRollupEntry("src/new/framework/index.ts"),
    createRollupEntry("src/new/browser/index.ts"),
    createRollupEntry("src/new/node/index.ts"),
  ].flat();
};
