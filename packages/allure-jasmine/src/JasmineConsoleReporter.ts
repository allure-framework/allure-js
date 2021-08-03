export class JasmineConsoleReporter implements jasmine.CustomReporter {
  log(message: string): void {
    // eslint-disable-next-line no-console
    console.log(new Date().toISOString(), message);
  }

  suiteStarted(suite: jasmine.CustomReporterResult): void {
    this.log(`Suite started: ${suite.fullName}`);
  }

  suiteDone(): void {
    this.log("Suite ended\n\n");
  }

  specStarted(spec: jasmine.CustomReporterResult): void {
    this.log(`Case started: ${spec.description}`);
  }

  specDone(spec: jasmine.CustomReporterResult): void {
    this.log(`Case ended: ${spec.status}\n\n`);
    /* for (const fail of spec.failedExpectations) {
      console.error(fail.message);
      console.error(fail.stack);
    }*/
  }
}
