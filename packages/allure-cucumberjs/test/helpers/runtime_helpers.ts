import {
  IDefineSupportCodeMethods,
  ISupportCodeLibrary,
} from "@cucumber/cucumber/lib/support_code_library_builder/types";
import { IdGenerator } from "@cucumber/messages";
import { SupportCodeLibraryBuilder } from "@cucumber/cucumber/lib/support_code_library_builder";
import * as messages from "@cucumber/messages";
import IEnvelope = messages.Envelope;
import EventEmitter from "events";
import { assembleTestCases } from "@cucumber/cucumber/lib/runtime/assemble_test_cases";
import TestCaseRunner from "@cucumber/cucumber/lib/runtime/test_case_runner";
import { PredictableTestRunStopwatch } from "@cucumber/cucumber/lib/runtime/stopwatch";
import { valueOrDefault } from "@cucumber/cucumber/lib/value_checker";
import { IRuntimeOptions } from "@cucumber/cucumber";

export function buildOptions(overrides: Partial<IRuntimeOptions>): IRuntimeOptions {
  return {
    dryRun: false,
    predictableIds: false,
    failFast: false,
    filterStacktraces: false,
    retry: 0,
    retryTagFilter: "",
    strict: true,
    worldParameters: {},
    ...overrides,
  };
}

type DefineSupportCodeFunction = (methods: IDefineSupportCodeMethods) => void;

export const buildSupportCodeLibrary = (fn: DefineSupportCodeFunction): ISupportCodeLibrary => {
  const supportCodeLibraryBuilder = new SupportCodeLibraryBuilder();
  supportCodeLibraryBuilder.reset(__dirname, IdGenerator.incrementing());
  fn(supportCodeLibraryBuilder.methods);
  return supportCodeLibraryBuilder.finalize();
};

interface ITestRunnerRequest {
  gherkinDocument: messages.GherkinDocument;
  pickle: messages.Pickle;
  retries?: number;
  skip?: boolean;
  supportCodeLibrary: ISupportCodeLibrary;
}

interface ITestRunnerResponse {
  envelopes: messages.Envelope[];
  result: messages.TestStepResultStatus;
}

export const testRunner = async (options: ITestRunnerRequest): Promise<ITestRunnerResponse> => {
  const envelopes: IEnvelope[] = [];
  const eventBroadcaster = new EventEmitter();
  const newId = IdGenerator.incrementing();
  const testCase = (
    await assembleTestCases({
      eventBroadcaster,
      newId,
      pickles: [options.pickle],
      supportCodeLibrary: options.supportCodeLibrary,
    })
  )[options.pickle.id];

  // listen for envelopers _after_ we've assembled test cases
  eventBroadcaster.on("envelope", (e) => envelopes.push(e));
  const runner = new TestCaseRunner({
    eventBroadcaster,
    stopwatch: new PredictableTestRunStopwatch(),
    gherkinDocument: options.gherkinDocument,
    newId,
    pickle: options.pickle,
    testCase,
    retries: valueOrDefault(options.retries, 0)!,
    skip: valueOrDefault(options.skip, false)!,
    supportCodeLibrary: options.supportCodeLibrary,
    worldParameters: {},
  });
  const result = await runner.run();
  return { envelopes, result };
};
