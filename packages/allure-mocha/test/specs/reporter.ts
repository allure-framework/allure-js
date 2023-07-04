import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { restore, stub } from "sinon";

describe("reporter", () => {
  beforeEach(() => {
    restore();
    stub(fs, "mkdirSync").callsFake(() => "");
  });

  describe("parallel mode", () => {
    it("prints warnings about allure api", () => {
      const out = spawnSync(
        "tsx",
        ["--tsconfig", "test/tsconfig.json", "test/fixtures/runners/parallel.ts"],
        {
          cwd: process.cwd(),
        },
      );

      expect(out.stderr.toString("utf8")).contains("can't be used in parallel mode");
    });
  });

  describe("single thread mode", () => {
    it("doesn't print any warning about allure api", () => {
      const out = spawnSync(
        "tsx",
        ["--tsconfig", "test/tsconfig.json", "test/fixtures/runners/singleThread.ts"],
        {
          cwd: process.cwd(),
        },
      );

      expect(out.stderr.toString("utf8")).not.contains("can't be used in parallel mode");
    });
  });
});
