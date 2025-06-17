import type { TestStats } from '@wdio/reporter';
import WDIOReporter from '@wdio/reporter';
import { Stage, Status } from 'allure-js-commons';
import { ReporterRuntime, createDefaultWriter } from 'allure-js-commons/sdk/reporter';
import type { AllureConfig } from './types.js';

export class AllureReporter extends WDIOReporter {
    private runtime: ReporterRuntime;
    private currentTest: string | null = null;

    constructor(options: AllureConfig = {}) {
        const { resultsDir = './allure-results', ...restOptions } = options;
        const outputDir = resultsDir || './allure-results';
        super({
            outputDir,
            outputFile: `${outputDir}/allure-results.json`,
            ...restOptions
        });
        
        this.runtime = new ReporterRuntime({
            writer: createDefaultWriter({ resultsDir: outputDir }),
            ...restOptions
        });
    }

    onTestStart(test: TestStats): void {
        this.currentTest = this.runtime.startTest({
            name: test.title,
            fullName: test.fullTitle,
            historyId: test.uid,
            status: Status.PASSED,
            stage: Stage.RUNNING
        });
        
        if (test.parent) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.labels = [...(result.labels || []), { name: 'suite', value: test.parent }];
            });
        }

        // Add framework label
        this.runtime.updateTest(this.currentTest, (result) => {
            result.labels = [...(result.labels || []), { name: 'framework', value: 'wdio' }];
        });

        // Add custom labels if present
        if ((test as any).severity) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.labels = [...(result.labels || []), { name: 'severity', value: (test as any).severity }];
            });
        }
        if ((test as any).feature) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.labels = [...(result.labels || []), { name: 'feature', value: (test as any).feature }];
            });
        }
        if ((test as any).story) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.labels = [...(result.labels || []), { name: 'story', value: (test as any).story }];
            });
        }

        // Add parameters if present
        if ((test as any).parameterNames && (test as any).parameterValues) {
            const names = (test as any).parameterNames;
            const values = (test as any).parameterValues;
            if (Array.isArray(names) && Array.isArray(values) && names.length === values.length) {
                this.runtime.updateTest(this.currentTest, (result) => {
                    result.parameters = [
                        ...(result.parameters || []),
                        ...names.map((name: string, i: number) => ({ name, value: String(values[i]) }))
                    ];
                });
            }
        }

        // Handle any attachments
        this.processAttachments(test);
    }

    onTestPass(test: TestStats): void {
        if (this.currentTest) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.status = Status.PASSED;
                result.stage = Stage.FINISHED;
            });
            // Process any attachments that were added during the test
            this.processAttachments(test);
            this.runtime.stopTest(this.currentTest);
            this.runtime.writeTest(this.currentTest);
        }
    }

    onTestFail(test: TestStats): void {
        if (this.currentTest) {
            this.runtime.updateTest(this.currentTest, (result) => {
                result.status = Status.FAILED;
                result.stage = Stage.FINISHED;
                if (test.error) {
                    result.statusDetails = {
                        message: test.error.message,
                        trace: test.error.stack
                    };
                }
            });
            // Process any attachments that were added during the test
            this.processAttachments(test);
            this.runtime.stopTest(this.currentTest);
            this.runtime.writeTest(this.currentTest);
        }
    }

    onTestSkip(test: TestStats): void {
        const testId = this.runtime.startTest({
            name: test.title,
            fullName: test.fullTitle,
            historyId: test.uid,
            status: Status.SKIPPED,
            stage: Stage.PENDING
        });

        if (test.parent) {
            this.runtime.updateTest(testId, (result) => {
                result.labels = [...(result.labels || []), { name: 'suite', value: test.parent }];
            });
        }

        // Add framework label
        this.runtime.updateTest(testId, (result) => {
            result.labels = [...(result.labels || []), { name: 'framework', value: 'wdio' }];
        });

        // Process any attachments
        this.processAttachments(test);

        this.runtime.stopTest(testId);
        this.runtime.writeTest(testId);
    }

    onRunnerEnd(): void {
        this.runtime.writeEnvironmentInfo();
        this.runtime.writeCategoriesDefinitions();
    }

    private processAttachments(test: TestStats): void {
        if (!test.output || !Array.isArray(test.output)) {
            return;
        }

        for (const output of test.output) {
            if (output.type === 'result' && output.result?.value) {
                const value = String(output.result.value);
                this.runtime.updateTest(this.currentTest || '', (result) => {
                    result.attachments = [
                        ...(result.attachments || []),
                        {
                            name: output.command || 'Command Result',
                            type: 'text/plain',
                            source: Buffer.from(value).toString('base64')
                        }
                    ];
                });
            }
        }
    }
} 