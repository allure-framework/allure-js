import * as process from "node:process";
import * as fs from "node:fs";
import { LabelName, Label } from "../../model.js";
import * as path from "node:path";
import { env } from "process";

export const getProjectRoot = (() => {
  let cachedProjectRoot: string | null = null;

  const resolveProjectRootByPath = () => {
    const cwd = process.cwd();
    let nextDir = cwd;
    let dir;

    do {
      dir = nextDir;
      try {
        fs.accessSync(
          path.join(dir, "package.json"),
          fs.constants.F_OK,
        );

        // package.json exists; use the directory as the project root
        return dir;
      } catch {}

      nextDir = path.dirname(dir);
    } while (nextDir.length < dir.length);

    // package.json doesn't exist in any parent; fall back to CWD
    return cwd;
  };

  return () => {
    if (!cachedProjectRoot) {
      cachedProjectRoot = resolveProjectRootByPath();
    }
    return cachedProjectRoot;
  };
})();

export const getRelativePath = (filepath: string) => {
  if (path.isAbsolute(filepath)) {
    const projectRoot = getProjectRoot();
    filepath = path.relative(projectRoot, filepath);
  }
  return filepath;
};

export const getPackageLabelFromPath = (filepath: string): Label => ({
  name: LabelName.PACKAGE,
  value: getRelativePath(filepath)
    .split(path.sep)
    .filter((v) => v)
    .join(".")
});

export const getGlobalLabels = () => {
  const ENV_NAME_PREFIX = "ALLURE_LABEL_";
  let globalLabels: Label[];
  const initGlobalLabels: () => Label[] = () =>
    Object.keys(env).filter(
      (varname) => varname.startsWith(ENV_NAME_PREFIX)
    ).map((varname) => ({
      name: varname.substring(ENV_NAME_PREFIX.length),
      value: env[varname] ?? "",
    })).filter((l) => l.name && l.value);
  return globalLabels ??= initGlobalLabels();
};
