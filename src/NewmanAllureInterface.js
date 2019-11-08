const Allure = require("allure-js-commons").Allure;
const isPromise = require("allure-js-commons").isPromise;
const WrappedStep = require("./WrappedStep");

class NewmanAllureInterface extends Allure {
    constructor(reporter, runtime) {
        super(runtime);
        this.reporter = reporter;
    }

    label(name, value) {
        try {
            this.reporter.currentTest.addLabel(name, value);
        }
        catch (_a) {
            this.reporter.addLabel(name, value);
        }
    }
    step(name, body) {
        const WrappedStep = this.startStep(name);
        let result;
        try {
            result = WrappedStep.run(body);
        }
        catch (err) {
            WrappedStep.endStep();
            throw err;
        }
        if (isPromise(result)) {
            const promise = result;
            return promise
                .then(a => {
                WrappedStep.endStep();
                return a;
            })
                .catch(e => {
                WrappedStep.endStep();
                throw e;
            });
        }
        WrappedStep.endStep();
        return result;
    }

    setDescription(description) {
        this.currentExecutable.description = description;
    }
    setDescriptionHtml(html) {
        this.currentExecutable.descriptionHtml = html;
    }

    logStep(name, status) {
        this.step(name, () => { }); // todo status
    }

    attachment(name, content, type) {
        const file = this.reporter.writeAttachment(content, type);
        this.currentExecutable.addAttachment(name, type, file);
    }
    testAttachment(name, content, type) {
        const file = this.reporter.writeAttachment(content, type);
        this.currentTest.addAttachment(name, type, file);
    }

    addEnvironment(name, value) {
        this.currentTest.addParameter('environment-variable', name, value);
        return this;
    }

    startStep(name) {
        const allureStep = this.currentExecutable.startStep(name);
        this.reporter.pushStep(allureStep);
        return new WrappedStep(this.reporter, allureStep);
    }

    endThisStep(status) {
        const curStep = this.reporter.popStep();
        curStep.endStep(status);
    }

    get currentTest() {
        if (this.reporter.currentTest === null) {
            throw new Error("No test running!");
        }
        return this.reporter.currentTest;
    }
    get currentExecutable() {
        const executable = this.reporter.currentStep || this.reporter.currentTest;
        if (executable === null) {
            throw new Error("No executable!");
        }
        return executable;
    }
}

module.exports = NewmanAllureInterface;