import { buildOptions, buildSupportCodeLibrary } from "./runtime_helpers";
import { EventEmitter } from "events";
import { IdGenerator } from "@cucumber/messages";
import * as messages from "@cucumber/messages";
import { PassThrough } from "stream";
import { promisify } from "util";
import { Runtime, FormatterBuilder, IRuntimeOptions } from "@cucumber/cucumber";
import { ISupportCodeLibrary } from "@cucumber/cucumber/lib/support_code_library_builder/types";
import { IParsedArgvFormatOptions } from "@cucumber/cucumber/lib/cli/argv_parser";
import { EventDataCollector } from "@cucumber/cucumber/lib/formatter/helpers";
import { emitSupportCodeMessages } from "@cucumber/cucumber/lib/cli/helpers";
import { generateEvents } from "./gherkin_helpers";
import {
  CucumberJSAllureFormatter,
  CucumberJSAllureFormatterConfig,
} from "../../src/CucumberJSAllureReporter";
import getColorFns from "@cucumber/cucumber/lib/formatter/get_color_fns";
import { AllureRuntime, InMemoryAllureWriter, AllureResults } from "allure-js-commons";

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
  parsedArgvOptions?: IParsedArgvFormatOptions;
}

export async function runFeatures({
  parsedArgvOptions = {},
  runtimeOptions = {},
  supportCodeLibrary,
  sources = [],
}: ITestFormatterOptions): Promise<AllureResults> {
  const eventBroadcaster = new EventEmitter();
  const eventDataCollector = new EventDataCollector(eventBroadcaster);
  emitSupportCodeMessages({
    supportCodeLibrary,
    eventBroadcaster,
    newId: uuid(),
  });
  let output = "";
  const snippetBuilder = FormatterBuilder.getStepDefinitionSnippetBuilder({
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
      colorFns: getColorFns(false),
      snippetBuilder,
    },
    allureRuntime,
    new CucumberJSAllureFormatterConfig(),
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
}
