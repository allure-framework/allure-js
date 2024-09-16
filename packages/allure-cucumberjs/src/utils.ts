import type { Pickle } from "@cucumber/messages";
import path from "node:path";
import { getPosixPath, getRelativePath } from "allure-js-commons/sdk/reporter";

export const getPathRelativeToProjectRoot = ({ uri }: Pickle) =>
  getRelativePath(
    // Pickle.uri is always relative to the CWD when run from the CLI.
    // However, it might be absolute if run from code.
    path.isAbsolute(uri) ? uri : path.join(process.cwd(), uri),
  );

export const getPosixPathRelativeToProjectRoot = (pickle: Pickle) => getPosixPath(getPathRelativeToProjectRoot(pickle));
