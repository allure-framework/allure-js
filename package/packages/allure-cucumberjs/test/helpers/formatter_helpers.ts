import { EventEmitter } from "events";
import process from "process";
import { PassThrough } from "stream";
import { promisify } from "util";
import { FormatterBuilder, IRuntimeOptions, Runtime } from "@cucumber/cucumber";
import { emitSupportCodeMessages } from "@cucumber/cucumber/lib/cli/helpers";
import { FormatOptions } from "@cucumber/cucumber/lib/formatter";
import getColorFns from "@cucumber/cucumber/lib/formatter/get_color_fns";
import EventDataCollector from "@cucumber/cucumber/lib/formatter/helpers/event_data_collector";
import { ISupportCodeLibrary } from "@cucumber/cucumber/lib/support_code_library_builder/types";
import * as messages from "@cucumber/messages";
import { IdGenerator } from "@cucumber/messages";
import { AllureResults, AllureRuntime, InMemoryAllureWriter } from "allure-js-commons";
import {
  CucumberJSAllureFormatter,
  CucumberJSAllureFormatterConfig,
} from "../../src/CucumberJSAllureReporter";
import { generateEvents } from "./gherkin_helpers";
import { buildOptions } from "./runtime_helpers";

const { uuid } = IdGenerator;

export interface ITestSource {
  data: string;
  uri: string;
}

export interface ITestRunOptions {
  runtimeOptions?: Partial<IRuntimeOptions>;
  supportCodeLibrary: ISupportCodeLibrary;
  sources?: ITestSource[];
  pickleFilter?: (pickle: messages.Pickle) => boolean;
}

export interface ITestFormatterOptions extends ITestRunOptions {
  parsedArgvOptions?: FormatOptions;
}

export const runFeatures = async (
  {
    parsedArgvOptions = {},
    runtimeOptions = {},
    supportCodeLibrary,
    sources = [],
  }: ITestFormatterOptions,
  config?: CucumberJSAllureFormatterConfig,
): Promise<AllureResults> => {
  const eventBroadcaster = new EventEmitter();
  const eventDataCollector = new EventDataCollector(eventBroadcaster);
  emitSupportCodeMessages({
    supportCodeLibrary,
    eventBroadcaster,
    newId: uuid(),
  });
  let output = "";
  const snippetBuilder = await FormatterBuilder.getStepDefinitionSnippetBuilder({
    cwd: "",
    snippetInterface: parsedArgvOptions.snippetInterface,
    snippetSyntax: parsedArgvOptions.snippetSyntax,
    supportCodeLibrary: supportCodeLibrary,
  });
  const passThrough = new PassThrough();
  const writer = new InMemoryAllureWriter();
  const allureRuntime = new AllureRuntime({
    writer,
    resultsDir: "unused",
  });
  new CucumberJSAllureFormatter(
    {
      cwd: "",
      eventBroadcaster,
      eventDataCollector,
      log: (data) => (output += data),
      parsedArgvOptions,
      stream: passThrough,
      cleanup: promisify(passThrough.end.bind(passThrough)),
      supportCodeLibrary,
      colorFns: getColorFns(passThrough, process.env, false),
      snippetBuilder,
    },
    allureRuntime,
    { ...config },
  );

  let pickleIds: string[] = [];
  for (const source of sources) {
    const { pickles } = await generateEvents({
      data: source.data,
      eventBroadcaster,
      uri: source.uri,
    });
    pickleIds = pickleIds.concat(pickles.map((p) => p.id));
  }
  const runtime = new Runtime({
    eventBroadcaster,
    eventDataCollector,
    newId: uuid(),
    options: buildOptions(runtimeOptions),
    pickleIds,
    supportCodeLibrary,
  });

  await runtime.start();

  return { ...writer };
};
