# allure-js-commons

> Common utilities for Allure framework JavaScript integrations

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

`allure-js-commons` is the shared runtime API and reporter SDK used by the packages in this repository. It gives you both:

- a high-level facade for test code, such as `allure.step()`, `allure.attachment()`, `allure.owner()`, and `allure.epic()`
- low-level building blocks for custom integrations, such as `ReporterRuntime`, writers, runtime message transport, and result model factories

Use it when you want to:

- enrich tests with Allure metadata from JavaScript or TypeScript
- write your own test framework integration
- build a custom adapter that emits standard `allure-results`
- reuse the same reporting model across multiple runners or tools

## Installation

Install the package with your package manager of choice:

```bash
npm install -D allure-js-commons
```

If you are building a custom integration, install your framework alongside it and add Allure Report separately when you want to render results:

- follow the [Allure Report 2 installation guide](https://allurereport.org/docs/install/) to use the `allure` CLI
- or install Allure Report 3 with `npm install -D allure` to use `npx allure`

## View the report

If your integration writes `./allure-results`, you can render it with either report generator.

Use Allure Report 2:

```bash
allure generate ./allure-results -o ./allure-report
allure open ./allure-report
```

Or use Allure Report 3:

```bash
npx allure generate ./allure-results
npx allure open ./allure-report
```

## Supported versions and platforms

- works in Node.js environments on Linux, macOS, and Windows
- used by the official integrations in this repository, which are validated in CI on Node.js 20 and 22
- intended for frameworks and tooling that can produce or consume Allure runtime messages and result files

## Overview

### High-level facade

The package root exports the API used directly inside tests:

- labels and links: `epic`, `feature`, `story`, `owner`, `severity`, `issue`, `tms`, `tag`
- descriptions and identifiers: `description`, `descriptionHtml`, `displayName`, `historyId`, `testCaseId`
- execution details: `parameter`, `step`, `logStep`
- attachments: `attachment`, `attachmentPath`, `globalAttachment`, `globalAttachmentPath`

These helpers delegate to the active test runtime, which integrations register with `setGlobalTestRuntime()`.

### Reporter SDK

The `allure-js-commons/sdk` entry points expose the pieces used by official integrations:

- `sdk/runtime`: runtime message transport and global runtime registration
- `sdk/reporter`: `ReporterRuntime`, writers, result factories, categories, environment info, and helper utilities
- `sdk`: shared types, runtime message definitions, serialization helpers, and metadata parsing helpers

## Basic usage in tests

```ts
import * as allure from "allure-js-commons";

await allure.epic("Authentication");
await allure.feature("Password sign-in");
await allure.owner("qa-team");
await allure.parameter("browser", "chromium");

await allure.step("Submit valid credentials", async () => {
  await allure.attachment("request", JSON.stringify({ login: "jane" }), {
    contentType: "application/json",
  });
});
```

## Creating your own integration

The official adapters in this repository follow the same basic flow:

1. Create a `ReporterRuntime` with a writer that persists `allure-results`.
2. Register a test runtime with `setGlobalTestRuntime()` so `allure-js-commons` calls inside tests can emit runtime messages.
3. Map your framework lifecycle events to `startTest`, `updateTest`, `stopTest`, `writeTest`, and optional scope or fixture methods.
4. Forward runtime messages from the active test into `ReporterRuntime.applyRuntimeMessages()`.

Here is a minimal example:

```ts
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ReporterRuntime, createDefaultWriter } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

class MyFrameworkRuntime extends MessageTestRuntime {
  constructor(private readonly forward: (message: RuntimeMessage) => void) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.forward(message);
  }
}

const reporterRuntime = new ReporterRuntime({
  writer: createDefaultWriter({ resultsDir: "./allure-results" }),
});

let currentTestUuid: string | undefined;

setGlobalTestRuntime(
  new MyFrameworkRuntime((message) => {
    if (currentTestUuid) {
      reporterRuntime.applyRuntimeMessages(currentTestUuid, [message]);
    } else {
      reporterRuntime.applyGlobalRuntimeMessages([message]);
    }
  }),
);

export const onTestStart = (name: string, fullName: string) => {
  currentTestUuid = reporterRuntime.startTest({
    name,
    fullName,
    stage: Stage.RUNNING,
  });
};

export const onTestPass = () => {
  if (!currentTestUuid) return;
  reporterRuntime.updateTest(currentTestUuid, (result) => {
    result.status = Status.PASSED;
    result.stage = Stage.FINISHED;
  });
  reporterRuntime.stopTest(currentTestUuid);
  reporterRuntime.writeTest(currentTestUuid);
  currentTestUuid = undefined;
};

export const onTestFail = (error: Error) => {
  if (!currentTestUuid) return;
  reporterRuntime.updateTest(currentTestUuid, (result) => {
    result.status = Status.BROKEN;
    result.stage = Stage.FINISHED;
    result.statusDetails = {
      message: error.message,
      trace: error.stack,
    };
  });
  reporterRuntime.stopTest(currentTestUuid);
  reporterRuntime.writeTest(currentTestUuid);
  currentTestUuid = undefined;
};
```

This approach lets framework callbacks manage test lifecycle state while user code keeps using the regular `allure-js-commons` facade.

## Useful building blocks

- `ReporterRuntime`: creates and writes tests, fixtures, steps, attachments, categories, and environment info
- `createDefaultWriter()`: writes to `./allure-results` in normal runs and switches to a message writer in test mode
- `FileSystemWriter`, `InMemoryWriter`, `MessageWriter`, `MessageReader`: transport and persistence helpers
- `setGlobalTestRuntime()`: connects the facade API to the currently active framework runtime
- `MessageTestRuntime` and `MessageHolderTestRuntime`: ready-made runtime message implementations for adapters
- `createTestResult()`, `createStepResult()`, `createFixtureResult()`, `createTestResultContainer()`: factories for manual result construction

## Labels from environment variables

Allure allows you to apply labels to every test through environment variables. Use the `ALLURE_LABEL_<labelName>=<labelValue>` format.

#### Examples

```bash
ALLURE_LABEL_epic="Story 1" npm test
```
