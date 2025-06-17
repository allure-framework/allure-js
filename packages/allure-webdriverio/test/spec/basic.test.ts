import { describe, it, beforeEach, expect, afterEach } from 'vitest';
import { AllureReporter } from '../../src';
import type { TestStats } from '@wdio/reporter';
import { Status } from '../../src/types';
import { mkdirSync, rmSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Writable } from 'stream';

interface AllureResult {
    name: string;
    status: string;
    stage: string;
    labels: Array<{ name: string; value: string }>;
    parameters: Array<{ name: string; value: string }>;
    attachments?: Array<{ name: string; type: string; source: string }>;
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

describe('AllureReporter', () => {
    let reporter: AllureReporter;
    const tempDir = join(process.cwd(), 'temp-test-results');

    beforeEach(() => {
        mkdirSync(tempDir, { recursive: true });
        reporter = new AllureReporter({
            resultsDir: tempDir,
            stdout: true,
            writeStream: new Writable({
                write(chunk, encoding, callback) {
                    callback();
                }
            })
        });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('should handle passed test correctly', () => {
        const test = {
            uid: '1',
            cid: '0-0',
            title: 'test case',
            fullTitle: 'suite test case',
            state: 'passed',
            parent: 'suite',
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal'
        } as unknown as TestStats;

        reporter.onTestStart(test);
        reporter.onTestPass(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test case');
        expect(result.status).toBe('passed');
        expect(result.stage).toBe('finished');
        
        // Verify framework label
        const frameworkLabel = result.labels.find(l => l.name === 'framework');
        expect(frameworkLabel).toBeDefined();
        expect(frameworkLabel?.value).toBe('wdio');
    });

    it('should handle failed test correctly', () => {
        const error = new Error('Test failed');
        const test = {
            uid: '2',
            cid: '0-0',
            title: 'failed test',
            fullTitle: 'suite failed test',
            state: 'failed',
            parent: 'suite',
            error,
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [],
            errors: [error],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal'
        } as unknown as TestStats;

        reporter.onTestStart(test);
        reporter.onTestFail(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('failed test');
        expect(result.status).toBe('failed');
        expect(result.stage).toBe('finished');
        
        // Verify framework label
        const frameworkLabel = result.labels.find(l => l.name === 'framework');
        expect(frameworkLabel).toBeDefined();
        expect(frameworkLabel?.value).toBe('wdio');
    });

    it('should handle skipped test correctly', () => {
        const test = {
            uid: '3',
            cid: '0-0',
            title: 'skipped test',
            fullTitle: 'suite skipped test',
            state: 'skipped',
            parent: 'suite',
            duration: 0,
            start: new Date(),
            type: 'test',
            output: [],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 0,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: true,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal'
        } as unknown as TestStats;

        reporter.onTestSkip(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('skipped test');
        expect(result.status).toBe('skipped');
        expect(result.stage).toBe('pending');
    });

    it('should handle test with attachments correctly', () => {
        const test = {
            uid: '4',
            cid: '0-0',
            title: 'test with attachment',
            fullTitle: 'suite test with attachment',
            state: 'passed',
            parent: 'suite',
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [{
                type: 'result',
                command: 'screenshot',
                result: {
                    value: 'base64-encoded-screenshot-data'
                }
            }],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal'
        } as unknown as TestStats;

        reporter.onTestStart(test);
        reporter.onTestPass(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with attachment');
        expect(result.status).toBe('passed');
        expect(result.attachments).toBeDefined();
        expect(result.attachments?.length).toBe(2);
        expect(result.attachments?.[1].type).toBe('text/plain');
        expect(result.attachments?.[1].name).toBe('screenshot');
    });

    it('should handle parameterized test correctly', () => {
        const test = {
            uid: '5',
            cid: '0-0',
            title: 'test with parameters',
            fullTitle: 'suite test with parameters',
            state: 'passed',
            parent: 'suite',
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal',
            parameterNames: ['browser', 'env'],
            parameterValues: ['chrome', 'staging']
        } as unknown as TestStats;

        // Simulate parameter handling
        reporter.onTestStart(test);
        reporter.onTestPass(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with parameters');
        expect(result.status).toBe('passed');
        expect(result.parameters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'browser', value: 'chrome' }),
                expect.objectContaining({ name: 'env', value: 'staging' })
            ])
        );
    });

    it('should handle test with multiple attachments', () => {
        const test = {
            uid: '6',
            cid: '0-0',
            title: 'test with multiple attachments',
            fullTitle: 'suite test with multiple attachments',
            state: 'passed',
            parent: 'suite',
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [
                {
                    type: 'result',
                    command: 'screenshot',
                    result: { value: 'base64-encoded-screenshot-data' }
                },
                {
                    type: 'result',
                    command: 'log',
                    result: { value: 'log output' }
                }
            ],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'normal'
        } as unknown as TestStats;

        reporter.onTestStart(test);
        reporter.onTestPass(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with multiple attachments');
        expect(result.status).toBe('passed');
        expect(result.attachments).toBeDefined();
        expect(result.attachments?.length).toBeGreaterThanOrEqual(2);
        expect(result.attachments?.map(a => a.name)).toEqual(
            expect.arrayContaining(['screenshot', 'log'])
        );
    });

    it('should handle test with custom labels', () => {
        const test = {
            uid: '7',
            cid: '0-0',
            title: 'test with labels',
            fullTitle: 'suite test with labels',
            state: 'passed',
            parent: 'suite',
            duration: 1000,
            start: new Date(),
            type: 'test',
            output: [],
            errors: [],
            retries: 0,
            end: new Date(),
            _duration: 1000,
            pass: () => {},
            fail: (errors?: Error[]) => {},
            skip: (reason: string) => {},
            pending: false,
            _stringifyDiffObjs: () => {},
            complete: false,
            severity: 'critical',
            feature: 'Login',
            story: 'User logs in'
        } as unknown as TestStats;

        reporter.onTestStart(test);
        reporter.onTestPass(test);

        const result = getLatestResult(tempDir);
        expect(result.name).toBe('test with labels');
        expect(result.status).toBe('passed');
        expect(result.labels).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'severity', value: 'critical' }),
                expect.objectContaining({ name: 'feature', value: 'Login' }),
                expect.objectContaining({ name: 'story', value: 'User logs in' })
            ])
        );
    });

    it('should write environment info and categories on runner end', () => {
        // Provide environment info and categories in the config
        const envReporter = new AllureReporter({
            resultsDir: tempDir,
            environmentInfo: { BROWSER: 'chrome', ENV: 'staging' },
            categories: [
                { name: 'UI', matchedStatuses: ['failed'], messageRegex: 'UI.*' }
            ],
            stdout: true,
            writeStream: new Writable({
                write(chunk, encoding, callback) {
                    callback();
                }
            })
        });
        envReporter.onRunnerEnd();
        const files = readdirSync(tempDir);
        expect(files).toEqual(
            expect.arrayContaining([
                'environment.properties',
                'categories.json'
            ])
        );
    });
}); 