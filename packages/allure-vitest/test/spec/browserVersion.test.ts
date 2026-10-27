import { createRequire } from "node:module";

import AllureVitestReporter from "allure-vitest/reporter";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Vitest } from "vitest/node";

const vitestPackage = createRequire(import.meta.url)("vitest/package.json") as { version: string };
const installedVersion = vitestPackage.version;

afterEach(() => {
  vitestPackage.version = installedVersion;
});

const createProject = (browser: boolean) => ({
  config: { browser: { enabled: browser }, setupFiles: [] as string[], runner: undefined },
  provide: vi.fn(),
});

describe("browser version requirement", () => {
  it.each(["1.3.0", "3.2.4", "4.0.18"])("rejects browser mode on Vitest %s before registering setup", (value) => {
    vitestPackage.version = value;
    const project = createProject(true);
    const reporter = new AllureVitestReporter({});

    expect(() => reporter.onInit({ projects: [project] } as unknown as Vitest)).toThrow(
      "allure-vitest browser mode requires Vitest 4.1 or newer. Node mode supports Vitest >=1.3.0.",
    );
    expect(project.config.setupFiles).toEqual([]);
  });

  it.each(["1.3.0", "3.2.4", "4.0.18"])("keeps Node mode available on Vitest %s", (value) => {
    vitestPackage.version = value;
    const project = createProject(false);
    const reporter = new AllureVitestReporter({});

    expect(() => reporter.onInit({ projects: [project] } as unknown as Vitest)).not.toThrow();
    expect(project.config.setupFiles).toEqual([expect.stringMatching(/[\\/]setup\.js$/)]);
    expect(project.provide).toHaveBeenCalledWith("__allure_vitest_custom_runner_module__", undefined);
  });

  it.each(["4.1.0", "4.1.10", "5.0.0"])("registers browser setup on Vitest %s", (value) => {
    vitestPackage.version = value;
    const project = createProject(true);
    const reporter = new AllureVitestReporter({});

    expect(() => reporter.onInit({ projects: [project] } as unknown as Vitest)).not.toThrow();
    expect(project.config.setupFiles).toEqual([expect.stringMatching(/[\\/]browser[\\/]setup\.js$/)]);
    expect(project.provide).not.toHaveBeenCalled();
  });
});
