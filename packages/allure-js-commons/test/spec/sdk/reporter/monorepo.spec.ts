import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("monorepo scenario", () => {
  it("should resolve project name per package", async () => {
    const monorepoRoot = join(tmpdir(), `allure-monorepo-test-${randomUUID()}`);
    const package1Dir = join(monorepoRoot, "packages", "frontend");
    const package2Dir = join(monorepoRoot, "packages", "backend");
    const relativeFile = join("test", "spec", "user.test.ts");
    const absoluteFile1 = join(package1Dir, relativeFile);
    const absoluteFile2 = join(package2Dir, relativeFile);
    const cwdSpy = vi.spyOn(process, "cwd");

    try {
      mkdirSync(join(package1Dir, "test", "spec"), { recursive: true });
      mkdirSync(join(package2Dir, "test", "spec"), { recursive: true });
      writeFileSync(join(package1Dir, "package.json"), JSON.stringify({ name: "frontend" }), "utf8");
      writeFileSync(join(package2Dir, "package.json"), JSON.stringify({ name: "backend" }), "utf8");
      writeFileSync(absoluteFile1, "", "utf8");
      writeFileSync(absoluteFile2, "", "utf8");

      cwdSpy.mockReturnValue(package1Dir);
      vi.resetModules();
      const { getProjectName, getRelativePath } = await import("../../../../src/sdk/reporter/utils.js");
      const projectName1 = getProjectName();
      const path1 = getRelativePath(absoluteFile1);

      cwdSpy.mockReturnValue(package2Dir);
      vi.resetModules();
      const { getProjectName: getProjectName2, getRelativePath: getRelativePath2 } = await import(
        "../../../../src/sdk/reporter/utils.js"
      );
      const projectName2 = getProjectName2();
      const path2 = getRelativePath2(absoluteFile2);

      expect(projectName1).toBe("frontend");
      expect(projectName2).toBe("backend");
      expect(path1).toBe(join("test", "spec", "user.test.ts"));
      expect(path2).toBe(join("test", "spec", "user.test.ts"));
    } finally {
      cwdSpy.mockRestore();
      rmSync(monorepoRoot, { recursive: true, force: true });
    }
  });
});
