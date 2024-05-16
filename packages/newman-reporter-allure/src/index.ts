/* eslint-disable @typescript-eslint/unbound-method */
import type { EventEmitter } from "events";
import type { ConsoleEvent, Cursor, NewmanRunExecutionAssertion } from "newman";
import type { CollectionDefinition, Event, HeaderList, Item, Request, Response } from "postman-collection";
import {
  AllureNodeReporterRuntime,
  ContentType,
  FileSystemAllureWriter,
  LabelName,
  MessageAllureWriter,
  Stage,
  Status,
} from "allure-js-commons/sdk/node";
import { AllureNewmanConfig, PmItem, RunningItem } from "./model.js";
import { extractMeta } from "./utils.js";

class AllureReporter {
  allureRuntime: AllureNodeReporterRuntime;
  allureConfig: AllureNewmanConfig;
  runningItems: RunningItem[] = [];
  currentCollection: CollectionDefinition;
  pmItemsByAllureUuid: Map<string, PmItem> = new Map();

  constructor(
    emitter: EventEmitter,
    reporterConfig: AllureNewmanConfig,
    options: {
      collection: CollectionDefinition;
    },
  ) {
    const { testMode, resultsDir = "./allure-results", ...restConfig } = reporterConfig;

    this.currentCollection = options.collection;
    this.allureConfig = reporterConfig;
    this.allureRuntime = new AllureNodeReporterRuntime({
      ...restConfig,
      writer: testMode
        ? new MessageAllureWriter(emitter)
        : new FileSystemAllureWriter({
            resultsDir,
          }),
    });
    this.registerEvents(emitter);
  }

  pathToItem(item: Item): string[] {
    if (!item || !(typeof item.parent === "function") || !(typeof item.forEachParent === "function")) {
      return [];
    }

    const chain: string[] = [];

    if (this.currentCollection.name && this.allureConfig.collectionAsParentSuite) {
      chain.push(this.currentCollection.name);
    }

    item.forEachParent((parent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      chain.unshift(parent.name || parent.id);
    });

    return chain;
  }

  getFullName(item: Item): string {
    const chain = this.pathToItem(item);

    return `${chain.join("/")}#${item.name}`;
  }

  attachString(name: string, value: string | string[]) {
    const stringToAttach = Array.isArray(value) ? value.join("\n") : value;

    if (!stringToAttach) {
      return;
    }

    const content = Buffer.from(stringToAttach, "utf8");

    this.allureRuntime.writeAttachment({
      contentType: ContentType.TEXT,
      name,
      content,
    });
  }

  headerListToJsonString(headers: HeaderList) {
    const ret: { [k: string]: any } = {};

    headers.all().forEach((h) => {
      ret[h.key] = h.value;
    });

    return JSON.stringify(ret, null, 4);
  }

  escape(val: string) {
    return (
      val
        .replace("\n", "")
        .replace("\r", "")
        // eslint-disable-next-line @typescript-eslint/quotes
        .replace('"', '"')
    );
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
    this.allureRuntime.startScope();
  }

  onPrerequest(
    err: any,
    args: {
      executions: Event[];
    },
  ) {
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

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
    const fullName = this.getFullName(item);
    const testPath = this.pathToItem(item);
    const { labels } = extractMeta(args.item.events);
    const currentTestUuid = this.allureRuntime.startTest({
      name: args.item.name,
      fullName,
      stage: Stage.RUNNING,
      labels: [
        { name: LabelName.LANGUAGE, value: "javascript" },
        { name: LabelName.FRAMEWORK, value: "newman" },
        { name: LabelName.HOST, value: "localhost" },
        ...labels,
      ],
    });

    this.allureRuntime.updateTest((test) => {
      const [parentSuite, suite, ...subSuites] = testPath;

      if (parentSuite) {
        test.labels.push({ name: LabelName.PARENT_SUITE, value: parentSuite });
      }

      if (suite) {
        test.labels.push({ name: LabelName.SUITE, value: suite });
      }

      if (subSuites.length) {
        test.labels.push({ name: LabelName.SUB_SUITE, value: subSuites.join(" > ") });
      }
    });
    this.pmItemsByAllureUuid.set(currentTestUuid as string, pmItem);

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
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

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
      this.attachString("PreRequest", currentPmItem.prerequest);
    }

    if (currentPmItem.testScript) {
      this.attachString("TestScript", currentPmItem.testScript);
    }

    if (currentPmItem.consoleLogs.length) {
      this.attachString("ConsoleLogs", currentPmItem.consoleLogs);
    }

    if (requestData?.headers && requestData?.headers?.count() > 0) {
      this.allureRuntime.writeAttachment({
        contentType: ContentType.JSON,
        name: "Request Headers",
        content: this.headerListToJsonString(requestData.headers),
      });
    }

    if (requestData?.body?.mode === "raw" && requestData.body.raw) {
      this.attachString("Request Body", requestData.body.raw);
    }

    if (response?.headers && response?.headers?.count() > 0) {
      this.allureRuntime.writeAttachment({
        name: "Response Headers",
        contentType: ContentType.JSON,
        content: this.headerListToJsonString(response.headers),
      });
    }

    if (response?.body) {
      this.allureRuntime.writeAttachment({
        name: "Response Body",
        contentType: ContentType.TEXT,
        content: response.body,
      });
    }

    this.allureRuntime.updateTest((test) => {
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
      if (currentAllureTest.status === Status.FAILED || currentAllureTest.status === Status.BROKEN) {
        return;
      }

      const details = this.escape(`Response code: ${response.code}, status: ${response.status}`);

      this.allureRuntime.updateTest((test) => {
        test.status = Status.FAILED;
        test.stage = Stage.FINISHED;
        test.statusDetails = {
          message: this.escape(failedAssertions.join(", ")),
          trace: details,
        };
      });
    } else if (requestError) {
      const errorMsg = this.escape(requestError);

      this.allureRuntime.updateTest((test) => {
        test.status = Status.BROKEN;
        test.stage = Stage.FINISHED;
        test.statusDetails = {
          message: errorMsg,
        };
      });
    } else {
      this.allureRuntime.updateTest((test) => {
        test.status = Status.PASSED;
        test.stage = Stage.FINISHED;
      });
    }

    this.allureRuntime.stopTest();
    this.allureRuntime.writeTest();
  }

  onTest(err: any, args: { executions: Event[] }) {
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

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

    this.allureRuntime.startStep({
      name: errName,
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: errMsg,
      },
    });

    currentPmItem.failedAssertions.push(errName);

    this.allureRuntime.stopStep();
  }

  onConsole(err: any, args: ConsoleEvent) {
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

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
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

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
    const currentAllureTest = this.allureRuntime.getCurrentTest();

    if (!currentAllureTest) {
      return;
    }

    const currentPmItem = this.pmItemsByAllureUuid.get(currentAllureTest.uuid as string);

    if (!currentPmItem) {
      return;
    }

    this.allureRuntime.startStep({
      name: args.assertion,
    });
    this.allureRuntime.updateStep((step) => {
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

    this.allureRuntime.stopStep();
  }

  onDone() {
    this.allureRuntime.writeScope();
  }
}

export default AllureReporter;
