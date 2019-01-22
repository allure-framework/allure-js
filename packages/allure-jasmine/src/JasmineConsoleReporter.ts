export class JasmineConsoleReporter implements jasmine.CustomReporter {
  log(message: string) {
    console.log(new Date().toISOString(), message);
  }

  suiteStarted(suite: jasmine.CustomReporterResult) {
    this.log(`Suite started: ${suite.fullName}`);
  }

  suiteDone() {
    this.log("Suite ended\n\n");
  }

  specStarted(spec: jasmine.CustomReporterResult) {
    this.log(`Case started: ${spec.description}`);
  }

  specDone(spec: jasmine.CustomReporterResult) {
    this.log(`Case ended: ${spec.status}\n\n`);
    /*for (const fail of spec.failedExpectations) {
      console.error(fail.message);
      console.error(fail.stack);
    }*/
  }
}
