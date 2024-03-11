import typescript from "@rollup/plugin-typescript";
import { glob } from "glob";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import dts from "rollup-plugin-dts";

const dirname = fileURLToPath(new URL(".", import.meta.url));

const createRollupEntry = (inputFile, outputFileBase) => [
  defineConfig({
    input: inputFile,
    output: {
      file: join(dirname, `${outputFileBase}.js`),
      format: "es",
    },
    plugins: [typescript()],
  }),
  defineConfig({
    input: inputFile,
    output: {
      file: join(dirname, `${outputFileBase}.d.ts`),
      format: "es",
    },
    plugins: [dts()],
  }),
  defineConfig({
    input: inputFile,
    output: {
      file: join(dirname, `${outputFileBase}.cjs`),
      format: "cjs",
    },
    plugins: [typescript()],
  }),
];

export default () => {
  return [
    createRollupEntry(join(dirname, "index.ts"), "dist/index"),
    createRollupEntry(join(dirname, "internal.ts"), "dist/internal"),
    createRollupEntry(join(dirname, "src/new/framework/index.ts"), "dist/new/framework"),
    createRollupEntry(join(dirname, "src/new/browser/index.ts"), "dist/new/browser"),
    createRollupEntry(join(dirname, "src/new/node/index.ts"), "dist/new/node"),
  ].flat();
};
