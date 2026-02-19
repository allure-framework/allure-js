# Architecture: Allure Bun Integration

## 🏗️ Overview

This document describes the architecture of the Allure Bun test runner integration.

## 📊 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Bun Test Runner                         │
│  (test execution, lifecycle hooks, test context)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ hooks (beforeAll, beforeEach, etc.)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    setup.ts                                  │
│  • Initialize BunTestRuntime                                 │
│  • Set global test runtime                                   │
│  • Expose allure API globally                                │
│  • Track current test context                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ creates & manages
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              BunTestRuntime.ts                               │
│  • Extends MessageTestRuntime                                │
│  • Collects runtime messages                                 │
│  • Stores messages per test                                  │
│  • Provides sendMessage() implementation                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ receives messages from
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Test Code (user)                              │
│  • Calls allure.step()                                       │
│  • Calls allure.attachment()                                 │
│  • Uses @severity, @epic, etc.                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ after test completion
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  reporter.ts                                 │
│  • AllureBunReporter class                                   │
│  • Processes completed tests                                 │
│  • Applies runtime messages                                  │
│  • Writes results to disk                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ uses
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           ReporterRuntime (from SDK)                         │
│  • Manages test/step lifecycle                               │
│  • Handles metadata                                          │
│  • Writes JSON results                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ writes to
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            File System (allure-results/)                     │
│  • test-result-*.json                                        │
│  • container-*.json                                          │
│  • attachments                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Initialization Phase (beforeAll)

```typescript
beforeAll() → setup.ts
  ├─ Create BunTestRuntime instance
  ├─ Set global test runtime
  ├─ Parse test plan
  └─ Expose allure API globally
```

### 2. Test Execution Phase (per test)

```typescript
beforeEach() → setup.ts
  └─ Set current test context in runtime

test("my test") → user code
  ├─ allure.step("Step 1")
  │   └─ BunTestRuntime.sendMessage({type: "step_start", ...})
  │       └─ Store message in messagesStore
  │
  ├─ allure.attachment("data", ...)
  │   └─ BunTestRuntime.sendMessage({type: "attachment_add", ...})
  │       └─ Store message in messagesStore
  │
  └─ Test completes

afterEach() → setup.ts
  ├─ Get messages from runtime
  ├─ Store in test.meta.allureRuntimeMessages
  └─ Clear runtime messages
```

### 3. Reporting Phase (after all tests)

```typescript
reporter.handleTest(task) → reporter.ts
  ├─ Extract metadata (name, suite, labels)
  ├─ Start test in ReporterRuntime
  ├─ Apply runtime messages
  │   ├─ Create steps
  │   ├─ Add attachments
  │   └─ Apply labels/links
  ├─ Update test status
  └─ Write test result to disk
```

## 🧩 Key Components

### 1. **setup.ts** - Lifecycle Manager

**Responsibilities:**
- Initialize Allure infrastructure
- Manage test context
- Hook into Bun test lifecycle

**Key Functions:**
- `beforeAll()` - Setup runtime and globals
- `beforeEach()` - Set current test context
- `afterEach()` - Collect and store messages
- `afterAll()` - Cleanup

### 2. **BunTestRuntime.ts** - Message Collector

**Responsibilities:**
- Collect runtime messages during test execution
- Store messages per test ID
- Implement MessageTestRuntime interface

**Key Methods:**
- `setCurrentTest(testId)` - Set active test
- `sendMessage(message)` - Store message for current test
- `getMessages(testId)` - Retrieve messages for test
- `clearMessages(testId)` - Cleanup after test

### 3. **reporter.ts** - Result Processor

**Responsibilities:**
- Process completed tests
- Transform to Allure model
- Write results to disk

**Key Methods:**
- `onInit()` - Initialize writer
- `handleTest(task)` - Process single test
- `onComplete()` - Finalize reporting

### 4. **utils.ts** - Helper Functions

**Responsibilities:**
- Extract metadata from test names
- Parse suite paths
- Generate test IDs
- Test plan filtering

## 📝 Data Structures

### RuntimeMessage

```typescript
interface RuntimeMessage {
  type: "step_start" | "step_stop" | "attachment_add" | "metadata_add";
  data: any;
}
```

**Example:**
```typescript
{
  type: "step_start",
  data: {
    name: "Step 1",
    start: 1234567890
  }
}
```

### BunTestTask

```typescript
interface BunTestTask {
  name: string;           // "login test @severity:critical"
  file: string;           // "test/auth.test.ts"
  state: BunTestState;    // "pass" | "fail" | "skip" | "todo"
  error?: Error;
  duration?: number;
  meta?: {
    allureRuntimeMessages?: RuntimeMessage[];
    allureTestId?: string;
    allureSkip?: boolean;
  };
}
```

### TestResult (Allure Model)

```typescript
interface TestResult {
  uuid: string;
  name: string;
  fullName: string;
  status: Status;
  stage: Stage;
  statusDetails: StatusDetails;
  steps: StepResult[];
  attachments: Attachment[];
  parameters: Parameter[];
  labels: Label[];
  links: Link[];
  start: number;
  stop: number;
}
```

## 🔀 Sequence Diagram

```
User Test Code    BunTestRuntime    setup.ts    Reporter    ReporterRuntime    FileSystem
     │                  │              │            │              │                │
     │                  │   beforeAll  │            │              │                │
     │                  │◄─────────────┤            │              │                │
     │                  │              │            │              │                │
     │                  │  beforeEach  │            │              │                │
     │                  │◄─────────────┤            │              │                │
     │                  │ setCurrentTest            │              │                │
     │                  │              │            │              │                │
     │  allure.step()   │              │            │              │                │
     ├─────────────────►│              │            │              │                │
     │                  │ sendMessage  │            │              │                │
     │                  │ (store msg)  │            │              │                │
     │                  │              │            │              │                │
     │  allure.attachment()            │            │              │                │
     ├─────────────────►│              │            │              │                │
     │                  │ sendMessage  │            │              │                │
     │                  │              │            │              │                │
     │ test completes   │              │            │              │                │
     │                  │              │            │              │                │
     │                  │  afterEach   │            │              │                │
     │                  │◄─────────────┤            │              │                │
     │                  │ getMessages  │            │              │                │
     │                  ├─────────────►│            │              │                │
     │                  │              │ store in   │              │                │
     │                  │              │ test.meta  │              │                │
     │                  │              │            │              │                │
     │                  │              │   handleTest              │                │
     │                  │              │            │◄─────────────┤                │
     │                  │              │            │ startTest    │                │
     │                  │              │            ├─────────────►│                │
     │                  │              │            │              │                │
     │                  │              │            │ applyRuntimeMessages          │
     │                  │              │            ├─────────────►│                │
     │                  │              │            │              │                │
     │                  │              │            │ updateTest   │                │
     │                  │              │            ├─────────────►│                │
     │                  │              │            │              │                │
     │                  │              │            │ writeTest    │                │
     │                  │              │            ├─────────────►│                │
     │                  │              │            │              │ write JSON     │
     │                  │              │            │              ├───────────────►│
```

## 🎨 Design Patterns

### 1. **Message-Based Communication**

Runtime messages decouple test execution from result processing:
- Tests → Runtime (collect messages)
- Runtime → Reporter (process messages)

### 2. **Factory Pattern**

```typescript
export const createReporter = (config?: ReporterConfig): AllureBunReporter => {
  return new AllureBunReporter(config);
};
```

### 3. **Singleton Runtime**

```typescript
const bunTestRuntime = new BunTestRuntime();
setGlobalTestRuntime(bunTestRuntime);
```

### 4. **Decorator Pattern**

Allure API functions decorate test code:

```typescript
await step("My step", async () => {
  // Test code wrapped in step
});
```

## 🔧 Extension Points

### Custom Reporter

```typescript
class CustomBunReporter extends AllureBunReporter {
  handleTest(task: BunTestTask): void {
    // Custom processing
    super.handleTest(task);
  }
}
```

### Custom Runtime

```typescript
class CustomBunRuntime extends BunTestRuntime {
  async sendMessage(message: RuntimeMessage): Promise<void> {
    // Custom message handling
    await super.sendMessage(message);
  }
}
```

## 📊 Performance Considerations

1. **Message Storage**: In-memory map, cleared after each test
2. **Lazy Initialization**: Reporter created only when needed
3. **Batch Writing**: Results written after test completion
4. **No Blocking**: All operations are async where possible

## 🧪 Testing Strategy

1. **Unit Tests**: Test individual components (utils, runtime)
2. **Integration Tests**: Test full flow with mock Bun runner
3. **E2E Tests**: Run actual tests and verify reports

## 🔄 Future Improvements

1. **Parallel Test Support**: Better handling of concurrent tests
2. **Streaming Reporter**: Real-time result streaming
3. **Custom Formatters**: Allow custom result formatting
4. **Plugin System**: Extensible architecture for custom behavior