import * as Mocha from "mocha";
import path from "node:path";
import type { ReporterDoneFn, ReporterEntry, ReporterModuleOrCtor, ReporterOptions } from "./types.js";

type CanonicalReporterEntry = readonly [ReporterModuleOrCtor, ReporterOptions];
type ShortReporterEntry = readonly [ReporterModuleOrCtor];
type LoadedReporterEntry = readonly [Mocha.ReporterConstructor, ReporterOptions];

export const enableExtraReporters = (
  runner: Mocha.Runner,
  options: Mocha.MochaOptions,
  extraReportersConfig: ReporterEntry | readonly ReporterEntry[],
) => {
  const extraReporterEntries = Array.from(generateCanonicalizedReporterEntries(extraReportersConfig));
  const loadedReporterEntries = loadReporters(extraReporterEntries);
  return instantiateReporters(runner, options, loadedReporterEntries);
};

export const doneAll = (
  reporters: readonly Mocha.reporters.Base[],
  failures: number,
  fn?: ((failures: number) => void) | undefined,
) => {
  const doneCallbacks = collectDoneCallbacks(reporters);
  let callbacksToWait = doneCallbacks.length + 1;
  const onReporterIsDone = () => {
    if (--callbacksToWait === 0) {
      fn?.(failures);
    }
  };

  for (const done of doneCallbacks) {
    done(failures, onReporterIsDone);
  }

  onReporterIsDone(); // handle the synchronous completion
};

const generateCanonicalizedReporterEntries = function* (
  reporters: ReporterEntry | readonly ReporterEntry[] | undefined,
): Generator<CanonicalReporterEntry, void, undefined> {
  if (reporters) {
    if (!(reporters instanceof Array)) {
      yield [reporters, {}];
    } else {
      if (isReporterArrayEntry(reporters)) {
        yield resolveReporterArrayEntry(reporters);
      } else {
        yield* reporters.map((e) => {
          return resolveReporterEntry(e);
        });
      }
    }
  }
};

const loadReporters = (reporterEntries: readonly CanonicalReporterEntry[]): LoadedReporterEntry[] =>
  reporterEntries.map(([moduleOrCtor, options]) => [loadReporterModule(moduleOrCtor), options]);

const instantiateReporters = (
  runner: Mocha.Runner,
  options: Mocha.MochaOptions,
  entries: readonly LoadedReporterEntry[],
) => {
  const reporters: Mocha.reporters.Base[] = [];
  for (const [Reporter, reporterOptions] of entries) {
    const optionsForReporter = {
      ...options,
      reporterOptions,
      // eslint-disable-next-line quote-props
      reporterOption: reporterOptions,
      "reporter-option": reporterOptions,
    };
    reporters.push(new Reporter(runner, optionsForReporter));
  }
  return reporters;
};

const collectDoneCallbacks = (reporters: readonly Mocha.reporters.Base[]) => {
  const doneCallbacks: ReporterDoneFn[] = [];
  for (const reporter of reporters) {
    if (reporter.done) {
      doneCallbacks.push(reporter.done.bind(reporter));
    }
  }
  return doneCallbacks;
};

const isReporterArrayEntry = (
  reporters: ShortReporterEntry | CanonicalReporterEntry | readonly ReporterEntry[],
): reporters is ShortReporterEntry | CanonicalReporterEntry => {
  const [maybeReporterModuleOrCtor, maybeReporterOptions = {}] = reporters;
  return (
    !(maybeReporterModuleOrCtor instanceof Array) &&
    typeof maybeReporterOptions === "object" &&
    !(maybeReporterOptions instanceof Array)
  );
};

const loadReporterModule = (moduleOrCtor: ReporterModuleOrCtor) => {
  if (typeof moduleOrCtor === "string") {
    const builtInReporters = Mocha.reporters as Record<string, Mocha.ReporterConstructor>;
    const builtInReporterCtor = builtInReporters[moduleOrCtor];
    if (builtInReporterCtor) {
      return builtInReporterCtor;
    }

    const reporterModulePath = getReporterModulePath(moduleOrCtor);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      return require(reporterModulePath) as Mocha.ReporterConstructor;
    } catch (e: any) {
      throw new Error(`Can't load the '${moduleOrCtor}' reporter from ${reporterModulePath}: ${e.message}`);
    }
  }

  if (typeof moduleOrCtor !== "function") {
    throw new Error(`A reporter value must be a string or a constructor. Got ${typeof moduleOrCtor}`);
  }

  return moduleOrCtor;
};

const getReporterModulePath = (module: string) => {
  try {
    return require.resolve(module);
  } catch (e) {}

  try {
    return path.resolve(module);
  } catch (e: any) {
    throw new Error(`Can't resolve the '${module}' reporter's path: ${e.message}`);
  }
};

const resolveReporterEntry = (reporterEntry: ReporterEntry): CanonicalReporterEntry => {
  return reporterEntry instanceof Array ? resolveReporterArrayEntry(reporterEntry) : [reporterEntry, {}];
};

const resolveReporterArrayEntry = (
  reporterEntry: ShortReporterEntry | CanonicalReporterEntry,
): CanonicalReporterEntry => {
  if (reporterEntry.length < 1 || reporterEntry.length > 2) {
    throw new Error(
      `If an extra reporter entry is an array, it must contain one or two elements. ${reporterEntry.length} found`,
    );
  }

  return reporterEntry.length === 1 ? [...reporterEntry, {}] : [...reporterEntry];
};
