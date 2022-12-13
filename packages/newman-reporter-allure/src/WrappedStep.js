class WrappedStep {
    constructor(reporter, step) {
        this.reporter = reporter;
        this.step = step;
    }
    startStep(name) {
        const step = this.step.startStep(name);
        this.reporter.pushStep(step);
        return new WrappedStep(this.reporter, step);
    }
    endStep(status) {
        this.reporter.popStep();
        this.step.status = status;
        this.step.endStep();
    }

    run(body) {
        return this.step.wrap(body)();
    }
}

module.exports = WrappedStep;
