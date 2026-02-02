# allure-bun

> Allure integration for Bun Test Runner

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at [https://allurereport.org](https://allurereport.org)
- 📚 [Documentation](https://allurereport.org/docs/)
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support)
- 📢 [Official announcements](https://github.com/orgs/allure-framework/discussions/categories/announcements)
- 💬 [General Discussion](https://github.com/orgs/allure-framework/discussions/categories/general-discussion)

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Usage](#usage)
- [Configuration](#configuration)
- [Build System](#build-system)
- [Development](#development)
- [API Reference](#api-reference)
- [Examples](#examples)

---

## Installation

```bash
bun add -d allure-bun allure-commandline
```

## Quick Start

### 1. Configure bunfig.toml

```toml
[test]
preload = ["allure-bun/setup"]
```

### 2. Run tests

```bash
bun test
```

### 3. Generate report

```bash
allure serve ./allure-results
```

---

## Architecture

### Overview

`allure-bun` is a Bun Test Runner integration that collects test execution data and generates Allure reports. It consists of several key components:

```
┌─────────────────────────────────────────────────┐
│              Bun Test Runner                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│            BunTestRuntime                       │
│  (Collects runtime messages during execution)  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          AllureBunReporter                      │
│     (Processes tests and writes results)        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         allure-results/*.json                   │
│          (Test result files)                    │
└─────────────────────────────────────────────────┘
```

### Core Components

#### 1. **BunTestRuntime** (`src/BunTestRuntime.ts`)
- Extends `MessageTestRuntime` from `allure-js-commons`
- Collects runtime messages (steps, attachments, labels) during test execution
- Stores messages per test context
- Provides message retrieval and cleanup methods

#### 2. **AllureBunReporter** (`src/reporter.ts`)
- Main reporter class
- Processes completed tests
- Converts Bun test results to Allure format
- Writes test results to JSON files
- Handles test lifecycle (init, test execution, completion)

#### 3. **Setup Module** (`src/setup.ts`)
- Configures Bun test hooks (beforeAll, beforeEach, afterEach, afterAll)
- Initializes global Allure runtime
- Manages test context and metadata
- Auto-loaded via `bunfig.toml` preload

#### 4. **Utilities** (`src/utils.ts`)
- `extractMetadata()` - Parses test names for Allure metadata (@severity, @epic, etc.)
- `getTestFullName()` - Generates unique test identifiers
- `existsInTestPlan()` - Checks if test is in execution plan
- `generateTestId()` - Creates base64-encoded test IDs

#### 5. **Type Definitions** (`src/model.ts`)
- `AllureTestMetadata` - Test metadata interface
- `BunTestState` - Test result states (pass/fail/skip/todo)
- `BunTestTask` - Test task representation

---

## Module Structure

```
allure-bun/
├── src/
│   ├── BunTestRuntime.ts    # Runtime message collector
│   ├── reporter.ts           # Main reporter implementation
│   ├── setup.ts              # Bun test hooks setup
│   ├── utils.ts              # Helper functions
│   ├── model.ts              # TypeScript type definitions
│   └── index.ts              # Public API exports
├── scripts/
│   ├── fixup.mjs             # Post-compilation script (TypeScript)
│   └── fixup-babel.mjs       # Post-compilation script (Babel alternative)
├── test/
│   ├── simple.test.ts        # Basic tests without Allure
│   ├── example.test.ts       # Tests with Allure API
│   └── with-reporter.test.ts # Reporter integration tests
├── dist/                     # Compiled output
├── bunfig.toml              # Bun configuration
├── tsconfig.json            # TypeScript configuration
├── babel.esm.json           # Babel config for ESM
├── babel.cjs.json           # Babel config for CommonJS
└── package.json             # Package metadata
```

### Key Files

#### **setup.ts**
Automatically loaded before tests to configure Allure integration:
- Creates global `BunTestRuntime` instance
- Exposes `allure` API globally
- Manages test lifecycle hooks
- Collects and stores runtime messages

#### **reporter.ts**
Main reporter that processes test results:
- Converts Bun test format to Allure format
- Applies runtime messages (steps, attachments)
- Adds metadata (labels, links, categories)
- Writes JSON result files

#### **BunTestRuntime.ts**
Message storage and context management:
- Stores messages per test ID
- Provides current test context
- Thread-safe message collection
- Cleanup utilities

---

## Usage

### Basic Test

```typescript
import { test, expect } from "bun:test";

test("basic test", () => {
  expect(1 + 1).toBe(2);
});
```

### With Steps

```typescript
import { test, expect } from "bun:test";
import { step } from "allure-js-commons";

test("test with steps", async () => {
  await step("Step 1: Initialize", async () => {
    const data = { value: 42 };
    expect(data.value).toBe(42);
  });

  await step("Step 2: Process", async () => {
    const result = 10 * 5;
    expect(result).toBe(50);
  });
});
```

### With Attachments

```typescript
import { test, expect } from "bun:test";
import { attachment, ContentType } from "allure-js-commons";

test("test with attachments", async () => {
  await attachment("Test data", JSON.stringify({ test: "data" }), {
    contentType: ContentType.JSON,
  });

  await attachment("Screenshot", Buffer.from("..."), {
    contentType: ContentType.PNG,
  });

  expect(true).toBe(true);
});
```

### Metadata in Test Names

Add Allure metadata directly in test names using `@tag:value` syntax:

```typescript
test("login test @severity:critical @epic:Authentication @feature:Login", () => {
  expect(loginUser()).toBe(true);
});
```

Supported tags:
- `@severity:critical|blocker|normal|minor|trivial`
- `@epic:EpicName`
- `@feature:FeatureName`
- `@story:StoryName`
- `@owner:OwnerName`
- `@tag:TagName`

### Programmatic API

```typescript
import { test, expect } from "bun:test";

test("programmatic API", async () => {
  const allure = (globalThis as any).allure;

  allure.epic("User Management");
  allure.feature("Profile");
  allure.story("Update Avatar");
  allure.severity("critical");
  allure.owner("John Doe");
  allure.tag("smoke");

  await allure.step("Open profile page", async () => {
    expect(true).toBe(true);
  });
});
```

### Skip Tests

```typescript
test.skip("skipped test", () => {
  expect(false).toBe(true);
});

test.todo("todo test");
```

---

## Configuration

### Environment Variables

Configure Allure behavior via environment variables:

```bash
# Results output directory (default: ./allure-results)
export ALLURE_RESULTS_DIR=./custom-results

# Test plan file path
export ALLURE_TESTPLAN_PATH=./testplan.json

# Bun worker ID (auto-detected)
export BUN_WORKER_ID=0
```

### Reporter Configuration

```typescript
import { AllureBunReporter } from "allure-bun/reporter";

const reporter = new AllureBunReporter({
  resultsDir: "./allure-results",
  categories: [
    {
      name: "Product Defects",
      matchedStatuses: ["failed"],
      messageRegex: ".*AssertionError.*",
    },
    {
      name: "Test Defects",
      matchedStatuses: ["broken"],
    },
  ],
  environmentInfo: {
    "Node Version": process.version,
    "OS": process.platform,
  },
});
```

### Test Plan

Create `testplan.json` to run specific tests:

```json
{
  "version": "1.0",
  "tests": [
    {
      "id": "test/login.test.ts#should login successfully",
      "selector": "login"
    }
  ]
}
```

Run with test plan:

```bash
ALLURE_TESTPLAN_PATH=./testplan.json bun test
```

---

## Build System

### TypeScript Compilation (Default)

The default build uses TypeScript compiler (`tsc`):

```bash
npm run compile
# Runs: tsc --project ./tsconfig.json
```

Output structure:
```
dist/
├── *.js          # Compiled JavaScript (ESM)
├── *.d.ts        # Type definitions
├── *.js.map      # Source maps
└── package.json  # Module type marker (type: "module")
```

### Post-Compilation Fixup

#### **fixup.mjs** (TypeScript build)

Creates `dist/package.json` to mark the output as ESM:

```javascript
{
  "type": "module"
}
```

This ensures Node.js treats `.js` files in `dist/` as ES modules.

**Usage:**
```bash
node scripts/fixup.mjs
```

**When to use:** After TypeScript compilation when building for ESM-only.

---

#### **fixup-babel.mjs** (Babel build - Alternative)

Creates separate directories for dual-package support:

```
dist/
├── esm/
│   ├── package.json    # { "type": "module" }
│   └── *.js            # ES modules
└── cjs/
    ├── package.json    # { "type": "commonjs" }
    └── *.js            # CommonJS modules
```

**Usage:**
```bash
node scripts/fixup-babel.mjs
```

**When to use:**
- When using Babel for compilation
- When you need dual CommonJS + ESM support
- When targeting older Node.js versions

**Babel Configuration Files:**
- `babel.esm.json` - ESM output configuration
- `babel.cjs.json` - CommonJS output configuration

**Differences:**

| Feature | fixup.mjs | fixup-babel.mjs |
|---------|-----------|-----------------|
| Output format | ESM only | ESM + CJS |
| Directories | `dist/` | `dist/esm/` + `dist/cjs/` |
| Compiler | TypeScript | Babel |
| Node.js support | Modern (ESM) | Legacy + Modern |
| Package size | Smaller | Larger (2x files) |

---

### Custom Build Script

To use Babel with dual-package support:

1. **Install Babel dependencies:**
```bash
bun add -d @babel/core @babel/cli @babel/preset-typescript @babel/preset-env babel-plugin-add-module-exports
```

2. **Update package.json:**
```json
{
  "scripts": {
    "compile:babel-esm": "babel src --out-dir dist/esm --config-file ./babel.esm.json",
    "compile:babel-cjs": "babel src --out-dir dist/cjs --config-file ./babel.cjs.json",
    "compile:babel": "npm run compile:babel-esm && npm run compile:babel-cjs",
    "compile:fixup-babel": "node scripts/fixup-babel.mjs"
  }
}
```

3. **Run build:**
```bash
npm run compile:babel
npm run compile:fixup-babel
```

---

## Development

### Project Setup

```bash
# Clone repository
git clone https://github.com/allure-framework/allure-js.git
cd allure-js/packages/allure-bun

# Install dependencies (from monorepo root)
cd ../..
yarn install

# Build
cd packages/allure-bun
npm run compile
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/simple.test.ts

# Run with watch mode
bun test --watch
```

### Debugging

Set breakpoints in TypeScript files. Bun supports TypeScript natively.

```typescript
test("debug test", () => {
  debugger; // Will pause here
  expect(1).toBe(1);
});
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
tsc --noEmit
```

---

## API Reference

### Global API

When `setup.ts` is preloaded, these are available globally:

```typescript
declare global {
  var allure: AllureRuntime;
  var allureTestPlan: TestPlanV1 | undefined;
  var allureRuntime: BunTestRuntime;
}
```

### BunTestRuntime

```typescript
class BunTestRuntime extends MessageTestRuntime {
  setCurrentTest(testId: string): void;
  getMessages(testId: string): RuntimeMessage[];
  clearMessages(testId: string): void;
  clearAll(): void;
  sendMessage(message: RuntimeMessage): Promise<void>;
}
```

### AllureBunReporter

```typescript
class AllureBunReporter {
  constructor(config?: ReporterConfig);
  onInit(): void;
  handleTest(task: BunTestTask): void;
  onComplete(): void;
}
```

### Utility Functions

```typescript
// Extract @tag:value metadata from test names
function extractMetadata(task: BunTestTask): {
  name: string;
  suitePath: string[];
  labels: Label[];
  links: Link[];
};

// Generate full test identifier
function getTestFullName(task: BunTestTask): string;

// Check if test is in execution plan
function existsInTestPlan(task: BunTestTask, testPlan?: TestPlanV1): boolean;

// Generate base64 test ID
function generateTestId(task: BunTestTask): string;
```

### Allure Commons API

Full API from `allure-js-commons`:

```typescript
import {
  step,
  attachment,
  parameter,
  severity,
  epic,
  feature,
  story,
  tag,
  owner,
  link,
  issue,
  tms,
  description,
  descriptionHtml,
  testCaseId,
  historyId,
  label,
  labels
} from "allure-js-commons";
```

---

## Examples

### Complete Test Suite

```typescript
import { test, expect, describe } from "bun:test";
import { step, attachment, ContentType } from "allure-js-commons";

describe("User Authentication @epic:Authentication", () => {
  test("successful login @severity:critical @feature:Login", async () => {
    await step("Open login page", async () => {
      expect(true).toBe(true);
    });

    await step("Enter credentials", async () => {
      await attachment("Form data", JSON.stringify({
        username: "testuser",
        password: "***"
      }), { contentType: ContentType.JSON });
    });

    await step("Submit form", async () => {
      expect(true).toBe(true);
    });

    await step("Verify redirect", async () => {
      expect(window.location.href).toContain("/dashboard");
    });
  });

  test("failed login @severity:normal @feature:Login", async () => {
    await step("Enter invalid credentials", async () => {
      expect(() => login("bad", "creds")).toThrow();
    });
  });

  test.skip("password reset @feature:PasswordReset", () => {
    // Not implemented yet
  });
});
```

### Custom Reporter Usage

```typescript
import { afterAll } from "bun:test";
import { AllureBunReporter } from "allure-bun/reporter";
import type { BunTestTask } from "allure-bun";

const reporter = new AllureBunReporter({
  resultsDir: "./allure-results",
});

reporter.onInit();

const testResults: BunTestTask[] = [];

afterAll(() => {
  testResults.forEach(task => reporter.handleTest(task));
  reporter.onComplete();
});
```

---

## Troubleshooting

### Tests not generating reports

**Problem:** Tests run but no `allure-results` directory is created.

**Solution:** Ensure `setup.ts` is preloaded in `bunfig.toml`:
```toml
[test]
preload = ["allure-bun/setup"]
```

### "No test context available" warnings

**Problem:** Warnings about missing test context.

**Solution:** These appear when Allure API is called outside of test functions. This is expected and doesn't affect functionality.

### Module resolution errors

**Problem:** `Cannot find module 'allure-js-commons'`

**Solution:** Install dependencies:
```bash
bun install
```

This is a monorepo project. `allure-js-commons` is linked from `packages/allure-js-commons`.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting: `npm run lint:fix`
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage
- Update documentation
- Follow commit message conventions

---

## License

Apache-2.0

---

## Links

- [Allure Report](https://allurereport.org)
- [Bun Documentation](https://bun.sh/docs)
- [GitHub Repository](https://github.com/allure-framework/allure-js)
- [Issue Tracker](https://github.com/allure-framework/allure-js/issues)
- [Discussions](https://github.com/orgs/allure-framework/discussions)
