import { Status } from 'allure-js-commons';
import type { Category } from 'allure-js-commons/sdk';
import type { LinkConfig } from 'allure-js-commons/sdk/reporter';
import type { Reporters } from '@wdio/types';

export { Status };

export interface AllureConfig extends Partial<Reporters.Options> {
    resultsDir?: string;
    clean?: boolean;
    disableWebdriverStepsReporting?: boolean;
    disableWebdriverScreenshotsReporting?: boolean;
    categories?: Category[];
    environmentInfo?: Record<string, string>;
    links?: LinkConfig;
    globalLabels?: Record<string, string>;
}

export interface AllureReporterOptions {
    outputDir?: string;
    clean?: boolean;
    disableWebdriverStepsReporting?: boolean;
    disableWebdriverScreenshotsReporting?: boolean;
}

export interface StatusDetails {
    message?: string;
    trace?: string;
} 