import { Severity, Status } from 'allure2-js-commons';
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import { cleanResults, findLabel, findTest, runTests, whenResultsAppeared } from '../utils';

@suite
class SeveritySuite {
  before() {
    cleanResults();
    runTests('severity');
  }

  @test
  shouldHaveSeverity() {
    const testName = 'shouldAssignSeverity';
    return whenResultsAppeared().then(() => {
      expect(findTest('SeveritySubSuite')).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findLabel(testName, 'severity').value).eq(Severity.BLOCKER);
    });
  }
}
