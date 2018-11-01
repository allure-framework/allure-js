/* tslint:disable */
import { Status } from 'allure2-js-commons';
import { suite, test } from 'mocha-typescript';
import { MochaAllureInterface } from '../../../src/MochaAllureInterface';

// @ts-ignore
const allure: MochaAllureInterface = global.allure;

@suite
class GlobalInfo {
  @test
  shouldWriteExecutorInfo() {
    allure.getGlobalInfoWriter().writeExecutorInfo({
      name: 'Jenkins',
      type: 'jenkins',
      url: 'http://example.org',
      buildOrder: 11,
      buildName: 'allure-report_deploy#11',
      buildUrl: 'http://example.org/build#11',
      reportUrl: 'http://example.org/build#11/AllureReport',
      reportName: 'Demo allure report'
    });
  }

  @test
  shouldWriteEnvironment() {
    allure.getGlobalInfoWriter().writeEnvironmentInfo({
      Browser: 'chrome',
      GitHub: 'https://github.com/sskorol',
      Author: 'Sergey Korol'
    });
  }

  @test
  shouldWriteCategories() {
    allure.getGlobalInfoWriter().writeCategories([
      {
        name: 'Sad tests',
        messageRegex: /.*Sad.*/,
        matchedStatuses: [Status.FAILED]
      },
      {
        name: 'Infrastructure problems',
        messageRegex: '.*Error.*',
        matchedStatuses: [Status.BROKEN]
      }
    ]);
  }
}
