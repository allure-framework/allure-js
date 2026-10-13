# Allure Tinybench

`allure-tinybench` runs a Tinybench benchmark and records its completed tasks as Allure performance results.

## Install

```bash
npm install -D allure-tinybench allure-js-commons tinybench
```

## Usage

```ts
import { runWithAllure } from "allure-tinybench";
import { Bench } from "tinybench";

const bench = new Bench();

bench.add("aql.parse.simple", () => {
  parseAql('status = "passed"');
});

await runWithAllure(bench);
```

`runWithAllure()` calls `bench.run()` once, returns its result, and publishes every completed task in one batch through the configured global Allure runtime. Aborted tasks are included only when Tinybench provides the `aborted-with-statistics` result. Task names are preserved as metric keys and Tinybench's mean task latency (`result.period`) is reported in milliseconds. Choose stable, unique task names so they can serve as Allure metric keys.

All emitted metrics share the Unix epoch `start` and `stop` timestamps of the complete `bench.run()` invocation, in milliseconds. These timestamps describe the benchmark run, not individual task execution times.

Different `Bench` instances can be run concurrently. Do not call `runWithAllure()` concurrently with another run of the same `Bench` instance: Tinybench tasks and their results are mutable and shared within that instance. Use Tinybench's concurrency options to run tasks within a single benchmark concurrently.

The integration requires an active global Allure runtime, normally installed by a configured Allure reporter during a test run. In a standalone process without an Allure reporter, `allure-js-commons` uses its standard no-op runtime: it prints a warning and does not create a performance result file.

Titles, units, groups, trends, and preferred value direction belong in the Allure Report performance configuration.

```ts
export default {
  performance: {
    metrics: {
      "aql.parse.simple": {
        title: "Parse simple AQL",
        unit: "ms",
        better: "lower",
        group: "aql",
      },
    },
    groups: {
      aql: {
        title: "AQL",
      },
    },
  },
};
```
