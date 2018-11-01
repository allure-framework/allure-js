import { suite, test } from 'mocha-typescript';
import { MochaAllureInterface } from '../../../src/MochaAllureInterface';

// @ts-ignore
const allure: MochaAllureInterface = global.allure;

@suite
class Muted {
  @test
  shouldHighlightAsMuted() {
    allure.setMuted();
  }
}
