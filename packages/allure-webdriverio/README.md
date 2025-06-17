# Allure WebdriverIO Reporter

This is the [WebdriverIO](https://webdriver.io/) reporter for [Allure Framework](https://allurereport.org/). It provides detailed test execution reports with rich metadata, attachments, and test history.

## Installation

```bash
# Using npm
npm install allure-webdriverio --save-dev

# Using yarn
yarn add -D allure-webdriverio
```

## Usage

Update your WebdriverIO configuration file to use the Allure reporter:

```js
// wdio.conf.ts
import type { Options } from '@wdio/types'

export const config: Options.Testrunner = {
    // ...
    reporters: [
        ['allure', {
            outputDir: 'allure-results',
            disableWebdriverStepsReporting: false,
            disableWebdriverScreenshotsReporting: false,
            environmentInfo: {
                node: process.version,
                platform: process.platform,
                // Add any custom environment info
            },
            categories: [
                {
                    name: 'Failed tests',
                    messageRegex: '.*',
                    matchedStatuses: ['failed']
                }
            ],
            links: {
                issue: {
                    pattern: ['{}", "https://example.org/issue/{}'],
                    urlTemplate: "https://example.org/issue/%s"
                },
                tms: {
                    pattern: ["{}", "https://example.org/tms/{}"],
                    urlTemplate: "https://example.org/tms/%s"
                }
            }
        }]
    ],
    // ...
}
```

## Configuration Options

* `outputDir` - The directory where Allure report files will be written. Defaults to `./allure-results`
* `clean` - Clean the output directory before running tests. Defaults to `false`
* `disableWebdriverStepsReporting` - Disable automatic reporting of WebDriver commands. Defaults to `false`
* `disableWebdriverScreenshotsReporting` - Disable automatic reporting of screenshots. Defaults to `false`
* `environmentInfo` - Custom environment information to be displayed in the report. Type: `Record<string, string>`
* `categories` - Test result categories configuration. See [Categories](#categories) for more details
* `links` - Configuration for test case links. See [Links](#links) for more details
* `globalLabels` - Labels to be added to all test cases. Type: `Record<string, string>`

## Features

* Automatic test case status tracking
* WebDriver commands reporting
* Screenshot attachments
* Test suite hierarchies
* Parallel execution support
* Environment information
* Test categorization
* Test case links
* Custom labels and attachments

## Categories

Categories allow you to group test results based on their status and error messages:

```js
categories: [
    {
        name: 'Failed tests',
        messageRegex: '.*',
        matchedStatuses: ['failed']
    },
    {
        name: 'Product defects',
        messageRegex: '.*expected.*',
        matchedStatuses: ['broken']
    },
    {
        name: 'Test defects',
        messageRegex: '.*error.*',
        matchedStatuses: ['broken']
    }
]
```

## Links

You can configure links to external systems (like issue trackers or test management systems):

```js
links: {
    issue: {
        pattern: ["{}", "https://example.org/issue/{}"],
        urlTemplate: "https://example.org/issue/%s"
    },
    tms: {
        pattern: ["{}", "https://example.org/tms/{}"],
        urlTemplate: "https://example.org/tms/%s"
    }
}
```

## Example

```typescript
import { Status } from 'allure-webdriverio';

describe('User Login', () => {
    it('should login successfully with valid credentials', async () => {
        // Parameterized test example
        const browserName = browser.capabilities.browserName;
        const environment = process.env.TEST_ENV || 'staging';
        allure.addParameter('browser', browserName);
        allure.addParameter('env', environment);

        // Custom labels
        allure.addLabel('severity', 'critical');
        allure.addLabel('feature', 'Login');
        allure.addLabel('story', 'User logs in with valid credentials');

        // Add description
        allure.addDescription('This test verifies that a user can log in with valid credentials.');

        // Add links
        allure.addIssue('AUTH-123');
        allure.addTestId('LOGIN-1');

        // Test steps
        await allure.step('Open login page', async () => {
            await browser.url('/login');
        });
        await allure.step('Enter credentials and submit', async () => {
            await $('#username').setValue('user');
            await $('#password').setValue('password');
            await $('#login-button').click();
        });
        await allure.step('Verify successful login', async () => {
            await expect($('#welcome')).toBeDisplayed();
        });

        // Attach screenshot
        const screenshot = await browser.takeScreenshot();
        allure.addAttachment('Login Screenshot', Buffer.from(screenshot, 'base64'), 'image/png');
    });
});
```

## Generating Reports

After test execution, you'll have the Allure results in your `outputDir`. To generate and view the report:

1. Install the Allure command-line tool:
```bash
npm install -g allure-commandline
```

2. Generate and open the report:
```bash
# Generate the report
allure generate allure-results --clean

# Open the report
allure open
```

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details. 