/* eslint-disable @typescript-eslint/unbound-method */
import type { EventEmitter } from "events";
import type { ConsoleEvent, Cursor, NewmanRunExecutionAssertion } from "newman";
import { env } from "node:process";
import type { CollectionDefinition, Event, HeaderList, Item, Request, Response } from "postman-collection";
import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import {
  FileSystemWriter,
  MessageWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getSuiteLabels,
} from "allure-js-commons/sdk/reporter";
import type { AllureNewmanConfig, PmItem, RunningItem } from "./model.js";
import { extractMeta } from "./utils.js";

class AllureReporter {
  allureRuntime: ReporterRuntime;
  allureConfig: AllureNewmanConfig;
  runningItems: RunningItem[] = [];
  currentCollection: CollectionDefinition;
  pmItemsByAllureUuid: Map<string, PmItem> = new Map();
  currentTest?: string;
  currentScope?: string;
  rootCollectionName?: string;

  constructor(
    emitter: EventEmitter,
    reporterConfig: AllureNewmanConfig,
    options: {
      collection: CollectionDefinition;
    },
  ) {
    const { resultsDir = "./allure-results", ...restConfig } = reporterConfig;

    this.currentCollection = options.collection;
    this.rootCollectionName = options.collection.name;
    this.allureConfig = reporterConfig;
    this.allureRuntime = new ReporterRuntime({
      ...restConfig,
      writer: env.ALLURE_TEST_MODE
        ? new MessageWriter(emitter)
        : new FileSystemWriter({
            resultsDir,
          }),
    });
    this.registerEvents(emitter);
  }

  registerEvents(emitter: EventEmitter) {
    emitter.on("start", this.onStart.bind(this));
    emitter.on("beforeItem", this.onBeforeItem.bind(this));
    emitter.on("item", this.onItem.bind(this));
    emitter.on("prerequest", this.onPrerequest.bind(this));
    emitter.on("request", this.onRequest.bind(this));
    emitter.on("test", this.onTest.bind(this));
    emitter.on("assertion", this.onAssertion.bind(this));
    emitter.on("console", this.onConsole.bind(this));
    emitter.on("done", this.onDone.bind(this));
  }

  onStart() {
    this.currentScope = this.allureRuntime.startScope();
  }

  onPrerequest(
    err: any,
    args: {
      executions: Event[];
    },
  ) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem) {
      return;
    }

    const execScript = args.executions[0]?.script.exec?.join("\n");

    currentPmItem.prerequest = execScript;
  }

  onBeforeItem(err: any, args: { item: Item; cursor: Cursor }) {
    const pmItem: PmItem = {
      name: args.item.name,
      passed: true,
      failedAssertions: [],
      consoleLogs: [],
    };

    const itemGroup = args.item.parent();
    const item = args.item;
    const fullName = this.#getFullName(item);
    const testPath = this.#pathToItem(item);
    const { labels } = extractMeta(args.item.events);
    this.currentTest = this.allureRuntime.startTest({
      name: args.item.name,
      fullName,
      stage: Stage.RUNNING,
      labels: [
        { name: LabelName.LANGUAGE, value: "javascript" },
        { name: LabelName.FRAMEWORK, value: "newman" },
        { name: LabelName.HOST, value: "localhost" },
        ...labels,
        ...getEnvironmentLabels(),
      ],
    });

    this.allureRuntime.updateTest(this.currentTest, (test) => {
      test.labels.push(...getSuiteLabels(testPath));
    });

    this.pmItemsByAllureUuid.set(this.currentTest, pmItem);

    if (itemGroup && this.currentCollection !== itemGroup) {
      this.currentCollection = itemGroup;
    }
  }

  onItem(
    err: any,
    args: {
      item: Item;
    },
  ) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem) {
      return;
    }

    const requestData = currentPmItem.requestData;
    const requestDataURL = requestData && `${requestData.method} - ${requestData.url}`;
    const rawDescription = args.item.request.description;
    const testDescription = (typeof rawDescription === "string" ? rawDescription : rawDescription?.content) || "";
    const response = currentPmItem.responseData;
    const failedAssertions = currentPmItem.failedAssertions;
    const requestError = currentPmItem.requestError;

    if (currentPmItem.prerequest) {
      this.#attachString("PreRequest", currentPmItem.prerequest);
    }

    if (currentPmItem.testScript) {
      this.#attachString("TestScript", currentPmItem.testScript);
    }

    if (currentPmItem.consoleLogs.length) {
      this.#attachString("ConsoleLogs", currentPmItem.consoleLogs);
    }

    if (requestData?.headers && requestData?.headers?.count() > 0) {
      this.allureRuntime.writeAttachment(
        this.currentTest,
        undefined,
        "Request Headers",
        this.#headerListToJsonBuffer(requestData.headers),
        {
          contentType: ContentType.JSON,
        },
      );
    }

    if (requestData?.body?.mode === "raw" && requestData.body.raw) {
      this.#attachString("Request Body", requestData.body.raw);
    }

    if (response?.headers && response?.headers?.count() > 0) {
      this.allureRuntime.writeAttachment(
        this.currentTest,
        undefined,
        "Response Headers",
        this.#headerListToJsonBuffer(response.headers),
        {
          contentType: ContentType.JSON,
        },
      );
    }

    if (response?.body) {
      this.allureRuntime.writeAttachment(
        this.currentTest,
        undefined,
        "Response Body",
        Buffer.from(response.body, "utf-8"),
        {
          contentType: ContentType.TEXT,
        },
      );
    }

    this.allureRuntime.updateTest(this.currentTest, (test) => {
      if (requestDataURL) {
        test.parameters.push({
          name: "Request",
          value: requestDataURL,
        });
      }

      if (response?.code) {
        test.parameters.push({
          name: "Response Code",
          value: response?.code.toString(),
          excluded: true,
        });
      }

      if (testDescription) {
        const descriptionHtml = testDescription.replace(/[*]/g, "").replace(/\n/g, "<br>");

        test.description = testDescription;
        test.descriptionHtml = descriptionHtml;
      }
    });

    if (response && failedAssertions?.length) {
      const details = this.#escape(`Response code: ${response.code}, status: ${response.status}`);

      this.allureRuntime.updateTest(this.currentTest, (test) => {
        test.status = Status.FAILED;
        test.stage = Stage.FINISHED;
        test.statusDetails = {
          message: this.#escape(failedAssertions.join(", ")),
          trace: details,
        };
      });
    } else if (requestError) {
      const errorMsg = this.#escape(requestError);

      this.allureRuntime.updateTest(this.currentTest, (test) => {
        test.status = Status.BROKEN;
        test.stage = Stage.FINISHED;
        test.statusDetails = {
          message: errorMsg,
        };
      });
    } else {
      this.allureRuntime.updateTest(this.currentTest, (test) => {
        test.status = Status.PASSED;
        test.stage = Stage.FINISHED;
      });
    }

    this.allureRuntime.stopTest(this.currentTest);
    this.allureRuntime.writeTest(this.currentTest);
  }

  onTest(err: any, args: { executions: Event[] }) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem) {
      return;
    }

    const execScript = args.executions[0]?.script.exec?.join("\n");

    if (!execScript) {
      return;
    }

    currentPmItem.testScript = execScript;

    // not typed postman-collection error property ?
    const testArgs: any = args.executions[0];

    if (!testArgs.error) {
      return;
    }

    const errName: string = testArgs.error.name;
    const errMsg: string = testArgs.error.message;

    const stepUuid = this.allureRuntime.startStep(this.currentTest, undefined, {
      name: errName,
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: errMsg,
      },
    });

    if (!stepUuid) {
      // no such test running, ignore reporting
      return;
    }

    currentPmItem.failedAssertions.push(errName);

    this.allureRuntime.stopStep(stepUuid);
  }

  onConsole(err: any, args: ConsoleEvent) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem || err) {
      return;
    }

    if (args.level) {
      currentPmItem.consoleLogs.push(`level: ${args.level}, messages: ${args.messages.toString()}`);
    }
  }

  onRequest(
    err: any,
    args: {
      request: Request;
      response: Response;
    },
  ) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem) {
      return;
    }

    const req = args.request;
    const url = `${req.url.protocol || ""}://${args.request.url.getHost()}${req.url.getPathWithQuery()}`;

    currentPmItem.requestData = {
      url: url,
      method: req.method,
      body: req.body,
      headers: req.headers,
    };

    if (err) {
      currentPmItem.passed = false;
      currentPmItem.requestError = err.message;
    }

    if (!args.response) {
      return;
    }

    const respStream = args?.response?.stream;
    const respBody = respStream ? Buffer.from(respStream).toString() : "";

    currentPmItem.responseData = {
      status: args.response.status,
      code: args.response.code,
      body: respBody,
      headers: args.response.headers,
    };
  }

  onAssertion(err: any, args: NewmanRunExecutionAssertion) {
    if (!this.currentTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(this.currentTest);

    if (!currentPmItem) {
      return;
    }

    const stepUuid = this.allureRuntime.startStep(this.currentTest, undefined, {
      name: args.assertion,
    });
    if (!stepUuid) {
      // no such test running, ignore reporting
      return;
    }

    this.allureRuntime.updateStep(stepUuid, (step) => {
      if (err && currentPmItem) {
        currentPmItem.passed = false;
        currentPmItem.failedAssertions.push(args.assertion);

        step.statusDetails = {
          message: err.message,
          trace: err.stack,
        };
        step.status = Status.FAILED;
      } else {
        step.status = Status.PASSED;
      }

      step.stage = Stage.FINISHED;
    });

    this.allureRuntime.stopStep(stepUuid);
  }

  onDone() {
    if (this.currentScope) {
      this.allureRuntime.writeScope(this.currentScope);
      this.currentScope = undefined;
    }
  }

  #pathToItem(item: Item): string[] {
    if (!item || !(typeof item.parent === "function") || !(typeof item.forEachParent === "function")) {
      return [];
    }

    const chain: string[] = [];

    item.forEachParent((parent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      chain.unshift(parent.name || parent.id);
    });

    if (this.rootCollectionName) {
      chain.unshift(this.rootCollectionName);
    }
    return chain;
  }

  #getFullName(item: Item): string {
    const chain = this.#pathToItem(item);

    return `${chain.join("/")}#${item.name}`;
  }

  #attachString(name: string, value: string | string[]) {
    const stringToAttach = Array.isArray(value) ? value.join("\n") : value;

    if (!stringToAttach) {
      return;
    }

    const content = Buffer.from(stringToAttach, "utf-8");

    this.allureRuntime.writeAttachment(this.currentTest!, undefined, name, content, {
      contentType: ContentType.TEXT,
    });
  }

  #headerListToJsonBuffer(headers: HeaderList) {
    const ret: { [k: string]: any } = {};

    headers.all().forEach((h) => {
      ret[h.key] = h.value;
    });

    return Buffer.from(JSON.stringify(ret, null, 4), "utf-8");
  }

  #escape(val: string) {
    return (
      val
        .replace("\n", "")
        .replace("\r", "")
        // eslint-disable-next-line @typescript-eslint/quotes
        .replace('"', '"')
    );
  }
}

export default AllureReporter;
