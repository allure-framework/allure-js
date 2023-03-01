import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

import { InMemoryAllureWriter } from "allure-js-commons";
import codeceptRun from "codeceptjs/lib/command/run";

export const runTests = async (params: {
  files: Record<string, string>;
}): Promise<InMemoryAllureWriter> => {
  const configFile = "codecept.config.js";

  if (!(configFile in params.files)) {
    params.files[configFile] = await readFile(
      resolve(__dirname, "./default-codecept.config.js"),
      "utf-8",
    );
  }

  let data;
  const testPath = resolve(__dirname, `../test-results/${randomUUID()}`);

  await mkdir(testPath, {
    recursive: true,
  });

  await Promise.all(
    Object.keys(params.files).map(async (fileName) => {
      const filePath = resolve(testPath, fileName);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, params.files[fileName], {});
    }),
  );

  global.postProcessorForTest = (writer: InMemoryAllureWriter) => {
    data = writer;
  };

  const configPath = resolve(testPath, configFile);

  await codeceptRun(undefined, {
    config: configPath,
  });

  return data as any;
};
