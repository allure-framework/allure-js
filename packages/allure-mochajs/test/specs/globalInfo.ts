/* tslint:disable */
import { expect } from 'chai';
import { suite } from 'mocha-typescript';
import {
  cleanResults,
  findFiles,
  readProperties,
  readResults,
  runTests,
  whenResultsAppeared
} from '../utils/index';

@suite
class GlobalInfoSuite {
  before() {
    cleanResults();
    runTests('globalInfo');
  }

  @test
  shouldHaveGlobalInfo() {
    return whenResultsAppeared().then(() => {
      expect(readResults('categories.json').pop()).deep.eq([
        {
          name: 'Sad tests',
          messageRegex: '.*Sad.*',
          matchedStatuses: ['failed']
        },
        {
          name: 'Infrastructure problems',
          messageRegex: '.*Error.*',
          matchedStatuses: ['broken']
        }
      ]);

      expect(readResults('executor.json').pop()).deep.eq({
        name: 'Jenkins',
        type: 'jenkins',
        url: 'http://example.org',
        buildOrder: 11,
        buildName: 'allure-report_deploy#11',
        buildUrl: 'http://example.org/build#11',
        reportUrl: 'http://example.org/build#11/AllureReport',
        reportName: 'Demo allure report'
      });

      const environment = readProperties(findFiles('environment.properties').pop());
      expect(environment.get('Browser')).eq('chrome');
      expect(environment.get('GitHub')).eq('https://github.com/sskorol');
      expect(environment.get('Author')).eq('Sergey Korol');
    });
  }
}
