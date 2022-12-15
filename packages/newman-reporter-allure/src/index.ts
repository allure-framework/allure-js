/* eslint-disable @typescript-eslint/unbound-method */
import type { EventEmitter } from "events";
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  InMemoryAllureWriter,
  LabelName,
  md5,
  Stage,
  Status,
  StatusDetails,
} from "allure-js-commons";
import type { ConsoleEvent, Cursor, NewmanRunExecutionAssertion, NewmanRunOptions } from "newman";
import type {
  Collection,
  CollectionDefinition,
  Event,
  Item,
  Request,
  RequestBody,
  Response,
} from "postman-collection";
import { extractMeta } from "./helpers";

interface AllureOptions {
  export: string;
  postProcessorForTest?: any;
}

interface PmItem {
  name: string;
  passed: boolean;
  failedAssertions: string[];
  consoleLogs: string[];
  requestData?: PmRequestData;
  responseData?: PmResponseData;
  prerequest?: string;
  testScript?: string;
}

interface PmRequestData {
  url: string;
  method: string;
  body?: RequestBody;
}

interface PmResponseData {
  status: string;
  code: number;
  body: string;
}

interface RunningItem {
  name: string;
  allureTest: AllureTest;
  pmItem: PmItem;
  steps: AllureStep[];
}

class AllureReporter {
  suites: AllureGroup[] = [];
  runningItems: RunningItem[] = [];
  currentNMGroup: Collection;
  allureRuntime: AllureRuntime;
  reporterOptions: AllureOptions;
  options: {
    collection: CollectionDefinition;
  };
  allureWriter?: InMemoryAllureWriter;

  constructor(
    emitter: EventEmitter,
    reporterOptions: AllureOptions,
    options: {
      collection: CollectionDefinition;
    },
  ) {
    this.currentNMGroup = options.collection as Collection;
    this.allureWriter = reporterOptions.postProcessorForTest
      ? new InMemoryAllureWriter()
      : undefined;

    this.allureRuntime = new AllureRuntime({
      resultsDir: reporterOptions.export || "allure-results",
      writer: this.allureWriter,
    });

    this.reporterOptions = reporterOptions;
    this.options = options;

    this.registerEvents(emitter);
  }

  get currentSuite() {
    return this.suites.at(-1) || null;
  }

  get currentStep() {
    return this.currentRunningItem?.steps.at(-1) || null;
  }

  get currentRunningItem() {
    return this.runningItems.at(-1) || null;
  }

  get currentExecutable() {
    const executable = this.currentTest;
    if (!executable) {
      throw new Error("No executable!");
    }
    return executable;
  }

  get currentTest() {
    const currentItem = this.currentRunningItem;
    if (!currentItem) {
      throw new Error("No active test");
    }

    return currentItem.allureTest;
  }

  set currentTest(allureTest) {
    if (!this.currentRunningItem) {
      throw new Error("Cannot find current test");
    }

    this.currentRunningItem.allureTest = allureTest;
  }

  pathToItem(item: Item): string[] {
    if (
      !item ||
      !(typeof item.parent === "function") ||
      !(typeof item.forEachParent === "function")
    ) {
      return [];
    }

    const chain: string[] = [];
    item.forEachParent((parent) => {
      chain.unshift(parent.name || parent.id);
    });

    return chain;
  }

  getFullName(item: Item): string {
    const chain = this.pathToItem(item);
    return `${chain.join("/")}#${item.name}`;
  }

  attachConsoleLogs(logsArr: string[]) {
    if (logsArr.length) {
      const buf = Buffer.from(logsArr.join("\n"), "utf8");
      const file = this.allureRuntime.writeAttachment(buf, ContentType.TEXT);
      this.currentTest.addAttachment("consoleLogs", ContentType.TEXT, file);
    }
  }

  attachPrerequest(preReq: string) {
    if (preReq) {
      const buf = Buffer.from(preReq, "utf8");
      const file = this.allureRuntime.writeAttachment(buf, ContentType.TEXT);
      this.currentTest.addAttachment("preRequest", ContentType.TEXT, file);
    }
  }

  attachTestScript(testScript: string) {
    if (testScript) {
      const buf = Buffer.from(testScript, "utf8");
      const file = this.allureRuntime.writeAttachment(buf, ContentType.TEXT);
      this.currentTest.addAttachment("testScript", ContentType.TEXT, file);
    }
  }

  setDescriptionHtml(html: string) {
    if (html) {
      this.currentExecutable.descriptionHtml = html;
    }
  }

  endTest(allureTest: AllureTest, status: Status, details?: StatusDetails) {
    if (details) {
      allureTest.statusDetails = details;
    }
    allureTest.status = status;
    allureTest.stage = Stage.FINISHED;
    allureTest.endTest();
  }

  startStep(name: string) {
    const allureStep = this.currentExecutable.startStep(name);
    this.currentRunningItem?.steps.push(allureStep);
    return allureStep;
  }

  endStep(status: Status) {
    const step = this.currentRunningItem?.steps.pop();
    if (!step) {
      throw new Error("Step not found");
    }

    step.status = status;
    step.endStep();
  }

  itemName(item: Item, cursor: Cursor) {
    const parent = item.parent();
    const parentName = (parent as any)?.name || "";
    const folderOrEmpty =
      !parentName || parentName === this.options.collection.name ? "" : `${parentName}/`;
    const iteration = cursor && cursor.cycles > 1 ? `/${cursor.iteration}` : "";
    return this.escape(folderOrEmpty + item.name + iteration);
  }

  escape(val: string) {
    return (
      val
        .replace("\n", "")
        .replace("\r", "")
        // eslint-disable-next-line @typescript-eslint/quotes
        .replace('"', '"')
        .replace(/[\u0100-\uffff]/g, (c) => `|0x${c.charCodeAt(0).toString(16).padStart(4, "0")}`)
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

  onStart(_err: any, _args: any) {
    const suiteName = (this.options.collection as Collection).name;
    const scope = this.currentSuite || this.allureRuntime;
    const suite = scope.startGroup(suiteName || "Global");
    this.suites.push(suite);
    this.runningItems = [];
  }

  onPrerequest(
    _err: any,
    args: {
      executions: Event[];
    },
  ) {
    const execScript = args.executions[0]?.script.exec?.join("\n");

    if (this.currentRunningItem && execScript) {
      this.currentRunningItem.pmItem.prerequest = execScript;
    }
  }

  onBeforeItem(_err: any, args: { item: Item; cursor: Cursor }) {
    const pmItem: PmItem = {
      name: this.itemName(args.item, args.cursor),
      passed: true,
      failedAssertions: [],
      consoleLogs: [],
    };

    if (this.currentSuite === null) {
      throw new Error("No active suite");
    }
    const testName = pmItem.name;

    const allureTest = this.currentSuite.startTest(testName);

    allureTest.stage = Stage.RUNNING;

    const itemGroup = args.item.parent();

    const item = args.item;
    const fullName = this.getFullName(item);
    if (itemGroup && this.currentNMGroup !== itemGroup) {
      this.currentNMGroup = itemGroup as any;
    }
    const testPath = this.pathToItem(item);
    if (testPath[0]) {
      allureTest.addLabel(LabelName.PARENT_SUITE, testPath[0]);
    }
    if (testPath[1]) {
      allureTest.addLabel(LabelName.SUITE, testPath[1]);
    }
    const subSuites = testPath.slice(2);

    if (subSuites.length) {
      allureTest.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
    }

    allureTest.fullName = fullName;
    allureTest.testCaseId = md5(fullName);
    const { labels } = extractMeta(args.item.events);

    labels.forEach((label) => {
      allureTest.addLabel(label.name, label.value);
    });

    this.runningItems.push({
      name: fullName,
      allureTest: allureTest,
      pmItem: pmItem,
      steps: [],
    });
  }

  onItem(
    _err: any,
    args: {
      item: Item;
    },
  ) {
    // !TODO  please refactor me
    const rItem = this.runningItems[this.runningItems.length - 1];
    if (rItem.pmItem.prerequest) {
      this.attachPrerequest(rItem.pmItem.prerequest);
    }
    if (rItem.pmItem.testScript) {
      this.attachTestScript(rItem.pmItem.testScript);
    }
    if (rItem.pmItem.consoleLogs.length > 0) {
      this.attachConsoleLogs(rItem.pmItem.consoleLogs);
    }
    const requestDataURL =
      rItem.pmItem.requestData &&
      `${rItem.pmItem.requestData.method} - ${rItem.pmItem.requestData.url}`;

    let bodyModeProp = "";
    let bodyModePropObj: string;

    if (rItem.pmItem.requestData?.body) {
      bodyModeProp = rItem.pmItem.requestData.body.mode;
    }

    if (rItem.pmItem.requestData?.body && bodyModeProp === "raw") {
      bodyModePropObj = rItem.pmItem.requestData.body[bodyModeProp] || "";
    } else {
      bodyModePropObj = "";
    }

    const reqTableStr =
      bodyModeProp &&
      `<table>
        <tr>
          <th style="border: 1px solid #dddddd;text-align: left;padding: 8px;color:Orange;">
            ${bodyModeProp}
          </th>
          <td style="border: 1px solid #dddddd;text-align: left;padding: 8px;">
            <pre style="color:Orange">
              <b> ${bodyModePropObj} </b>
            </pre>
          </td>
        </tr>
      </table>`;

    let testDescription;
    if (args.item.request.description !== undefined) {
      if (typeof args.item.request.description === "string") {
        testDescription = args.item.request.description;
      } else {
        testDescription = args.item.request.description?.content;
      }

      testDescription = testDescription.replace(/[*]/g, "");
      testDescription = testDescription.replace(/\n/g, "<br>");
    } else {
      testDescription = "";
    }

    if (requestDataURL && rItem.pmItem.responseData) {
      this.setDescriptionHtml(
        `
        <p style="color:MediumPurple;">
          <b>
            ${testDescription}
          </b>
        </p>
        <h4 style="color:DodgerBlue;">
        <b>
          <i>Request:</i>
        </b>
        </h4>
        <p style="color:DodgerBlue">
          <b> ${requestDataURL}
          </b>
        </p> ${reqTableStr}
        </p>
        <h4 style="color:DodgerBlue;">
          <b>
            <i> Response: </i>
          </b>
        </h4>
        <p style="color:DodgerBlue">
          <b>${rItem.pmItem.responseData.code}</b>
        </p>`,
      );
    }

    if (rItem.pmItem.responseData?.body) {
      const attachment = this.allureRuntime.writeAttachment(rItem.pmItem.responseData?.body, {
        contentType: ContentType.TEXT,
      });

      this.currentExecutable.addAttachment(
        "response",
        { contentType: ContentType.TEXT },
        attachment,
      );
    }

    if (rItem.pmItem.responseData && rItem.pmItem.failedAssertions.length > 0) {
      const msg = this.escape(rItem.pmItem.failedAssertions.join(", "));
      const details = this.escape(
        `Response code: ${rItem.pmItem.responseData.code}, status: ${rItem.pmItem.responseData.status}`,
      );

      const error = {
        name: "AssertionError",
        message: msg,
        trace: details,
      };
      const latestStatus = rItem.allureTest.status;
      // if test already has a failed state, we should not overwrite it
      if (latestStatus === Status.FAILED || latestStatus === Status.BROKEN) {
        return;
      }
      const status = error.name === "AssertionError" ? Status.FAILED : Status.BROKEN;
      this.endTest(rItem.allureTest, status, { message: error.message });
    } else {
      this.endTest(rItem.allureTest, Status.PASSED);
    }
    this.runningItems.pop();
  }

  onTest(
    _err: any,
    args: {
      executions: Event[];
    },
  ) {
    const execScript = args.executions[0]?.script.exec?.join("\n");

    if (this.currentRunningItem && execScript) {
      this.currentRunningItem.pmItem.testScript = execScript;
    }
  }

  onConsole(err: any, args: ConsoleEvent) {
    if (err) {
      return;
    }

    if (args.level) {
      this.currentRunningItem?.pmItem.consoleLogs.push(
        `level: ${args.level}, messages: ${args.messages.toString()}`,
      );
    }
  }

  onRequest(
    err: any,
    args: {
      request: Request;
      response: Response;
    },
  ) {
    if (err) {
      return;
    }

    const req = args.request;

    const url = `${
      req.url.protocol || ""
    }://${args.request.url.getHost()}${req.url.getPathWithQuery()}`;

    const respStream = args.response.stream;
    const respBody = (respStream && Buffer.from(respStream).toString()) || "";

    this.runningItems[this.runningItems.length - 1].pmItem.requestData = {
      url: url,
      method: req.method,
      body: req.body,
    };

    this.runningItems[this.runningItems.length - 1].pmItem.responseData = {
      status: args.response.status,
      code: args.response.code,
      body: respBody,
    };
  }

  onAssertion(err: any, args: NewmanRunExecutionAssertion) {
    const stepName = args.assertion;
    const currStep = this.startStep(stepName);

    if (err && this.currentRunningItem) {
      this.currentRunningItem.pmItem.passed = false;
      this.currentRunningItem.pmItem.failedAssertions.push(args.assertion);

      currStep.status = Status.FAILED;
      currStep.endStep();
    } else {
      currStep.status = Status.PASSED;
    }
  }

  onDone(_err: any, _args: unknown) {
    if (this.currentSuite) {
      this.currentSuite.endGroup();
      this.suites.pop();
    }

    if (this.reporterOptions.postProcessorForTest) {
      this.reporterOptions.postProcessorForTest(this.allureWriter);
    }
  }
}

export = AllureReporter;
