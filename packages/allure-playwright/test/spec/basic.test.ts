import { expect, it, describe, beforeEach, afterEach } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { AllureReporter } from "../../src/index.js";
import { mkdirSync, rmSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface AllureResult {
    name: string;
    status: string;
    stage: string;
    labels: Array<{ name: string; value: string }>;
    parameters: Array<{ name: string; value: string }>;
    attachments?: Array<{ name: string; type: string; source: string }>;
    steps?: Array<{ name: string; status: string; steps?: Array<{ name: string; status: string }> }>;
}

function getLatestResult(resultsDir: string): AllureResult {
    const files = readdirSync(resultsDir);
    const resultFiles = files.filter(file => file.endsWith('-result.json'));
    if (resultFiles.length === 0) {
        throw new Error('No result files found');
    }
    const latestFile = resultFiles[resultFiles.length - 1];
    const content = readFileSync(join(resultsDir, latestFile), 'utf8');
    return JSON.parse(content);
}

describe('AllurePlaywright Basic Functionality', () => {
    let reporter: AllureReporter;
    const tempDir = join(process.cwd(), 'temp-test-results');

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
        reporter = new AllureReporter({
            resultsDir: tempDir
        });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('should handle passed test correctly', () => {
        // Mock Playwright test case
        const testCase = {
            title: 'test case',
            titlePath: () => ['root', 'test case'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'passed',
            duration: 1000,
            error: undefined,
            attachments: []
        };

        // Simulate test lifecycle
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test case');
        expect(result.status).toBe('passed');
        expect(result.stage).toBe('finished');
        
        // Verify framework label
        const frameworkLabel = result.labels?.find(l => l.name === 'framework');
        expect(frameworkLabel).toBeDefined();
        expect(frameworkLabel?.value).toBe('playwright');
    });

    it('should handle failed test correctly', () => {
        const error = new Error('Test failed');
        const testCase = {
            title: 'failed test',
            titlePath: () => ['root', 'failed test'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'failed',
            duration: 1000,
            error,
            attachments: []
        };

        // Simulate test lifecycle
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('failed test');
        expect(result.status).toBe('failed');
        expect(result.stage).toBe('finished');
        
        // Verify framework label
        const frameworkLabel = result.labels?.find(l => l.name === 'framework');
        expect(frameworkLabel).toBeDefined();
        expect(frameworkLabel?.value).toBe('playwright');
    });

    it('should handle skipped test correctly', () => {
        const testCase = {
            title: 'skipped test',
            titlePath: () => ['root', 'skipped test'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'skipped',
            duration: 0,
            error: undefined,
            attachments: []
        };

        // Simulate test lifecycle
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('skipped test');
        expect(result.status).toBe('skipped');
        expect(result.stage).toBe('finished');
    });

    it('should handle test with attachments correctly', () => {
        const testCase = {
            title: 'test with attachment',
            titlePath: () => ['root', 'test with attachment'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'passed',
            duration: 1000,
            error: undefined,
            attachments: [
                {
                    name: 'screenshot',
                    contentType: 'image/png',
                    body: Buffer.from('fake-screenshot-data')
                },
                {
                    name: 'text-attachment',
                    contentType: 'text/plain',
                    body: Buffer.from('test content')
                }
            ]
        };

        // Simulate test lifecycle
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with attachment');
        expect(result.status).toBe('passed');
        expect(result.attachments).toBeDefined();
        expect(result.attachments?.length).toBeGreaterThan(0);
        
        // Check for screenshot attachment
        const screenshotAttachment = result.attachments?.find(a => a.name === 'screenshot');
        expect(screenshotAttachment).toBeDefined();
        expect(screenshotAttachment?.type).toBe('image/png');
        
        // Check for text attachment
        const textAttachment = result.attachments?.find(a => a.name === 'text-attachment');
        expect(textAttachment).toBeDefined();
        expect(textAttachment?.type).toBe('text/plain');
    });

    it('should handle test with labels correctly', () => {
        const testCase = {
            title: 'test with labels',
            titlePath: () => ['root', 'test with labels'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'passed',
            duration: 1000,
            error: undefined,
            attachments: []
        };

        // Simulate test lifecycle
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with labels');
        expect(result.status).toBe('passed');
        
        // Verify default labels
        const frameworkLabel = result.labels?.find(l => l.name === 'framework');
        expect(frameworkLabel).toBeDefined();
        expect(frameworkLabel?.value).toBe('playwright');
        
        const languageLabel = result.labels?.find(l => l.name === 'language');
        expect(languageLabel).toBeDefined();
        expect(languageLabel?.value).toBe('javascript');
    });

    it('should handle test with steps correctly', () => {
        const testCase = {
            title: 'test with steps',
            titlePath: () => ['root', 'test with steps'],
            location: { file: 'test.spec.ts', line: 1, column: 1 },
            parent: {
                title: 'root',
                titlePath: () => ['root'],
                project: () => ({ testDir: process.cwd() })
            }
        };

        const testResult = {
            status: 'passed',
            duration: 1000,
            error: undefined,
            attachments: []
        };

        // Simulate test lifecycle with steps
        reporter.onBegin({ title: 'root' } as any);
        reporter.onTestBegin(testCase as any);
        
        // Simulate step creation (this would normally be done through allure.step calls)
        // For now, we'll just verify the basic test structure
        reporter.onTestEnd(testCase as any, testResult as any);
        reporter.onEnd();

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with steps');
        expect(result.status).toBe('passed');
        expect(result.stage).toBe('finished');
    });
}); 