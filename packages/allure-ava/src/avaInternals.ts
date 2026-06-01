import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const localRequire = createRequire(import.meta.url);

let avaRoot: string | undefined;

export const resolveAvaRoot = () => {
  if (avaRoot) {
    return avaRoot;
  }

  const avaEntryPoint = localRequire.resolve("ava");
  avaRoot = dirname(dirname(avaEntryPoint));

  return avaRoot;
};

export const resolveAvaLibPath = (...segments: string[]) => join(resolveAvaRoot(), ...segments);

export const importAvaLib = async <T = any>(...segments: string[]): Promise<T> =>
  (await import(pathToFileURL(resolveAvaLibPath(...segments)).href)) as T;
