import { access, constants, rm } from "node:fs/promises";
import { resolve } from "node:path";

export const setup = async () => {
  const runResultsDir = resolve(__dirname, "./fixtures");
  try {
    await access(runResultsDir, constants.F_OK);
    await rm(runResultsDir, { recursive: true });
  } catch {}
};
