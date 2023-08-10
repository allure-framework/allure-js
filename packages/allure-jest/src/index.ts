import os from "os";
import process from "process";
import { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import type { Circus, Config } from "@jest/types";
import {
  AllureGroup,
  AllureRuntime,
  AllureTest,
  getSuitesLabels,
  LabelName,
  Stage,
  Status,
} from "allure-js-commons";
import NodeEnvironment from "jest-environment-node";
import { getFullPath, getSuitePath } from "./utils";

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
const hostname = os.hostname();

export default class AllureJestEnv extends NodeEnvironment {
  runtime: AllureRuntime;
  runningTestsByFullname: Map<string, AllureTest> = new Map();
  runningGroupsByFullname: Map<string, AllureGroup> = new Map();

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);

    // this.testPath = context.testPath.replace(process.cwd(), "").replace(/(\/|\\)$/, "");
    this.runtime = new AllureRuntime({
      // TODO: configure it later
      resultsDir: "allure-results",
    });
  }

  setup() {
    return super.setup();
  }

  teardown() {
    return super.teardown();
  }

  handleTestEvent(event: Circus.Event, state: Circus.State) {
    switch (event.name) {
      case "test_start":
        this.handleTestStart(state);
        break;
      case "test_fn_success":
        this.handleTestPass(state);
        break;
      case "test_fn_failure":
        this.handleTestFail(state);
        break;
      case "test_skip":
        this.handleTestSkip(state);
        break;
      case "start_describe_definition":
        this.handleSuiteDefinitionStart(state);
        break;
      case "finish_describe_definition":
        this.handleSuiteDefinitionFinish(state);
        break;
      case "run_describe_start":
        this.handleSuiteStart(state);
        break;
      case "run_describe_finish":
        this.handleSuiteFinish(state);
        break;
      // TODO
      // case "hook_start":
      //   console.log("hook start", state);
      //   // this.reporter.startHook(event.hook.type);
      //   break;
      // case "hook_success":
      //   console.log("hook success", state);
      //   // this.reporter.endHook();
      //   break;
      // case "hook_failure":
      //   console.log("hook failure", state);
      //   // this.reporter.endHook(event.error ?? event.hook.asyncError);
      //   break;
      default:
        break;
    }
  }

  private getUnitFullname(unit: Circus.DescribeBlock | Circus.TestEntry): string {
    return getFullPath(unit).join(" > ");
  }

  private handleSuiteDefinitionStart(state: Circus.State) {
    const { currentDescribeBlock } = state;
    // TODO: not sure about id, probably we need just a stack
    const groupFullname = this.getUnitFullname(currentDescribeBlock);
    const hasParent = currentDescribeBlock?.parent?.name !== "ROOT_DESCRIBE_BLOCK";
    const parentGroup = hasParent
      ? this.runningGroupsByFullname.get(currentDescribeBlock.parent!.name)
      : undefined;
    const currentGroup = parentGroup ? parentGroup.startGroup() : new AllureGroup(this.runtime);

    currentGroup.name = currentDescribeBlock.name;

    this.runningGroupsByFullname.set(groupFullname, currentGroup);
  }

  private handleSuiteDefinitionFinish(state: Circus.State) {
    // console.log("suite definition finish", state.currentDescribeBlock);
    // debugger;
  }

  private handleSuiteStart(state: Circus.State) {
    // console.log("suite start", state.currentDescribeBlock);
  }

  private handleSuiteSkip(state: Circus.State) {
    // console.log("suite skip", state.currentDescribeBlock);
  }

  private handleSuiteFinish(state: Circus.State) {
    const { currentDescribeBlock } = state;
    const groupId = this.getUnitFullname(currentDescribeBlock);
    const group = this.runningGroupsByFullname.get(groupId);

    if (!group) {
      return;
    }

    group.endGroup();
    this.runningGroupsByFullname.delete(groupId);
  }

  private handleTestStart(state: Circus.State) {
    const { currentDescribeBlock, currentlyRunningTest } = state;
    const parentGroupFullname = this.getUnitFullname(currentDescribeBlock);
    const parentGroup = this.runningGroupsByFullname.get(parentGroupFullname);
    const currentTest = parentGroup ? parentGroup.startTest() : new AllureTest(this.runtime);
    const newTestFullname = this.getUnitFullname(currentlyRunningTest!);
    const suites = getSuitePath(currentlyRunningTest!);
    const thread = ALLURE_THREAD_NAME || process.pid.toString();
    const host = ALLURE_HOST_NAME || hostname;

    currentTest.name = currentlyRunningTest!.name;
    currentTest.fullName = newTestFullname;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "jest");

    if (thread) {
      currentTest.addLabel(LabelName.THREAD, thread);
    }

    if (host) {
      currentTest.addLabel(LabelName.HOST, host);
    }

    getSuitesLabels(suites).forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    this.runningTestsByFullname.set(newTestFullname, currentTest);
  }

  private handleTestPass(state: Circus.State) {
    const { currentlyRunningTest } = state;
    const currentTestId = this.getUnitFullname(currentlyRunningTest!);
    const currentTest = this.runningTestsByFullname.get(currentTestId)!;

    currentTest.stage = Stage.FINISHED;
    currentTest.status = Status.PASSED;
    currentTest.endTest();

    this.runningTestsByFullname.delete(currentTestId);
  }

  private handleTestFail(state: Circus.State) {
    const { currentlyRunningTest } = state;
    const currentTestId = this.getUnitFullname(currentlyRunningTest!);
    const currentTest = this.runningTestsByFullname.get(currentTestId)!;

    currentTest.stage = Stage.FINISHED;
    currentTest.status = Status.FAILED;
    currentTest.endTest();

    this.runningTestsByFullname.delete(currentTestId);
  }

  private handleTestSkip(state: Circus.State) {
    const { currentlyRunningTest } = state;
    const currentTestId = this.getUnitFullname(currentlyRunningTest!);
    const currentTest = this.runningTestsByFullname.get(currentTestId)!;

    currentTest.stage = Stage.PENDING;
    currentTest.status = Status.SKIPPED;
    currentTest.endTest();

    this.runningTestsByFullname.delete(currentTestId);
  }
}
