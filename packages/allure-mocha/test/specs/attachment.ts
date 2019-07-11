import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import {
  cleanResults,
  findAttachments,
  findStepAttachments,
  findSteps,
  findTest,
  runTests,
  whenResultsAppeared
} from "../utils/index";

@suite
class AttachmentsSuite {
  before() {
    cleanResults();
    runTests("attachment");
  }

  @test
  shouldHaveAttachments() {
    const testName = "shouldAssignAttachments";
    return whenResultsAppeared().then(() => {
      expect(findTest("AttachmentSubSuite")).not.eq(undefined);
      expect(findTest(testName).status).eq(Status.PASSED);

      const testAttachments = findAttachments(testName);
      expect(testAttachments).length(2);
      expect(testAttachments[0].name).eq("test attachment 1");
      expect(testAttachments[0].type).eq("text/plain");
      expect(testAttachments[1].name).eq("test attachment 2");
      expect(testAttachments[1].type).eq("application/json");

      expect(findSteps(testName)).length(2);

      let stepAttachments = findStepAttachments(testName, "step 1");
      expect(stepAttachments).length(2);
      expect(stepAttachments[0].name).eq("step 1 attachment 1");
      expect(stepAttachments[0].type).eq("text/plain");
      expect(stepAttachments[1].name).eq("step 1 attachment 2");
      expect(stepAttachments[1].type).eq("text/plain");

      stepAttachments = findStepAttachments(testName, "step 2");
      expect(stepAttachments).length(2);
      expect(stepAttachments[0].name).eq("step 2 attachment 1");
      expect(stepAttachments[0].type).eq("text/plain");
      expect(stepAttachments[1].name).eq("step 2 attachment 2");
      expect(stepAttachments[1].type).eq("text/plain");
    });
  }
}
