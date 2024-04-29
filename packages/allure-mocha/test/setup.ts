import { resolve } from "node:path";
import { access, constants, rm } from "node:fs/promises";

export const setup = async () => {
  const runResultsDir = resolve(__dirname, "./fixtures/run-results");
  try {
    await access(runResultsDir, constants.F_OK);
    await rm(runResultsDir, { recursive: true });
  } catch {}
};
