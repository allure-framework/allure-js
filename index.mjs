import { readFile, writeFile } from "node:fs/promises";
import glob from "glob";
const res = glob.sync("./packages/*/package.json");
const localWorkspaceVersions = {};

await Promise.all(
  res.map(async (packagePath) => {
    const packageContent = await readFile(packagePath, "utf-8");
    const { name, version } = JSON.parse(packageContent);
    localWorkspaceVersions[name] = version;
  }),
);

await Promise.all(
  res.map(async (packagePath) => {
    const packageContent = await readFile(packagePath, "utf-8");
    const parsedJson = JSON.parse(packageContent);
    for (const dep in parsedJson.dependencies) {
      if (localWorkspaceVersions[dep]) {
        parsedJson.dependencies[dep] = localWorkspaceVersions[dep];
      }
    }
    for (const dep in parsedJson.devDependencies) {
      if (localWorkspaceVersions[dep]) {
        parsedJson.devDependencies[dep] = localWorkspaceVersions[dep];
      }
    }

    await writeFile(packagePath, JSON.stringify(parsedJson, null, 2), "utf-8");
  }),
);
