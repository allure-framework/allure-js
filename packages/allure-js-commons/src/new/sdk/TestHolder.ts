export class TestHolder<T = unknown, K = unknown> {
  currentTest?: T;

  currentSteps: K[] = [];

  get currentStep() {
    return this.currentSteps?.[this.currentSteps.length - 1];
  }
}
