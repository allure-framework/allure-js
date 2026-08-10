import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

import type { Globals, TestResult, TestResultContainer } from "../../../model.js";
import type { Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
import { stringifyEnvInfo } from "../utils/envInfo.js";

const writeJson = (path: string, data: unknown): void => {
  writeFile(path, JSON.stringify(data), "utf-8");
};

const buildTempPath = (path: string): string => {
  return join(dirname(path), `${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
};

const writeAndFlushFile = (path: string, write: (fd: number) => void): void => {
  const fd = openSync(path, "w");

  try {
    write(fd);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
};

const publishFile = (path: string, writeTempFile: (path: string) => void): void => {
  const tempPath = buildTempPath(path);

  try {
    writeTempFile(tempPath);
    renameSync(tempPath, path);
  } finally {
    rmSync(tempPath, {
      force: true,
    });
  }
};

const writeFile = (path: string, data: string | Buffer, encoding?: BufferEncoding): void => {
  publishFile(path, (tempPath) => {
    writeAndFlushFile(tempPath, (fd) => {
      writeFileSync(fd, data, encoding);
    });
  });
};

const copyFile = (from: string, to: string): void => {
  publishFile(to, (tempPath) => {
    const fromFd = openSync(from, "r");

    try {
      writeAndFlushFile(tempPath, (toFd) => {
        const buffer = Buffer.allocUnsafe(64 * 1024);
        let bytesRead = 0;

        while ((bytesRead = readSync(fromFd, buffer, 0, buffer.length, null)) > 0) {
          let bytesWritten = 0;

          while (bytesWritten < bytesRead) {
            bytesWritten += writeSync(toFd, buffer, bytesWritten, bytesRead - bytesWritten);
          }
        }
      });
    } finally {
      closeSync(fromFd);
    }
  });
};

export class FileSystemWriter implements Writer {
  constructor(private config: { resultsDir: string }) {}

  writeAttachment(distFileName: string, content: Buffer): void {
    const path = this.buildPath(distFileName);

    writeFile(path, content);
  }

  writeAttachmentFromPath(distFileName: string, from: string): void {
    const to = this.buildPath(distFileName);

    copyFile(from, to);
  }

  writeEnvironmentInfo(info: EnvironmentInfo): void {
    const text = stringifyEnvInfo(info);
    const path = this.buildPath("environment.properties");

    writeFile(path, text);
  }

  writeCategoriesDefinitions(categories: Category[]): void {
    const path = this.buildPath("categories.json");

    writeJson(path, categories);
  }

  writeGroup(result: TestResultContainer): void {
    const path = this.buildPath(`${result.uuid}-container.json`);
    writeJson(path, result);
  }

  writeResult(result: TestResult): void {
    const path = this.buildPath(`${result.uuid}-result.json`);
    writeJson(path, result);
  }

  writeGlobals(distFileName: string, info: Globals): void {
    const path = this.buildPath(distFileName);
    writeJson(path, info);
  }

  private buildPath(name: string): string {
    mkdirSync(this.config.resultsDir, {
      recursive: true,
    });
    return join(this.config.resultsDir, name);
  }
}
