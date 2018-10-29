import { suite, test } from 'mocha-typescript';
import { MochaAllureInterface } from '../../../src/MochaAllureInterface';

// @ts-ignore
const allure: MochaAllureInterface = global.allure;

@suite
class IssueAndTms {
  @test
  shouldAssignIssueAndTms() {
    allure.addLink('1', 'http://localhost/issues/1', 'issue');
    allure.addLink('2', 'http://localhost/issues/2', 'tms');
    allure.addIssue('3');
  }
}
