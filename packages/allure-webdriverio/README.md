# Allure WebdriverIO Reporter

[![npm](https://img.shields.io/npm/dm/allure-webdriverio.svg)](https://www.npmjs.com/package/allure-webdriverio)
[![npm](https://img.shields.io/npm/v/allure-webdriverio.svg)](https://www.npmjs.com/package/allure-webdriverio)

This is the [WebdriverIO](https://webdriver.io/) reporter for [Allure Framework](https://allurereport.org/). It provides detailed test execution reports with rich metadata, attachments, and test history.

## Features

- ✅ **Automatic test case status tracking**
- ✅ **WebDriver commands reporting**
- ✅ **Screenshot attachments**
- ✅ **Test suite hierarchies**
- ✅ **Parallel execution support**
- ✅ **Environment information**
- ✅ **Test categorization**
- ✅ **Test case links**
- ✅ **Custom labels and attachments**
- ✅ **Parameterized test support**
- ✅ **Step-by-step test execution**

## Installation

```bash
# Using yarn (recommended)
yarn add -D allure-webdriverio

# Using npm
npm install allure-webdriverio --save-dev
```

## Quick Start

1. **Install the package:**
   ```bash
   yarn add -D allure-webdriverio
   ```

2. **Update your WebdriverIO configuration:**
   ```js
   // wdio.conf.ts
   import type { Options } from '@wdio/types'

   export const config: Options.Testrunner = {
       // ... other config
       reporters: [
           ['allure', {
               outputDir: 'allure-results',
               disableWebdriverStepsReporting: false,
               disableWebdriverScreenshotsReporting: false
           }]
       ],
       // ... rest of config
   }
   ```

3. **Run your tests:**
   ```bash
   yarn wdio run wdio.conf.ts
   ```

4. **Generate and view the report:**
   ```bash
   # Install Allure CLI
   yarn global add allure-commandline

   # Generate report
   allure generate allure-results --clean

   # Open report
   allure open
   ```

## Configuration

### Basic Configuration

```js
// wdio.conf.ts
export const config: Options.Testrunner = {
    // ... other config
    reporters: [
        ['allure', {
            outputDir: 'allure-results',
            clean: true,
            disableWebdriverStepsReporting: false,
            disableWebdriverScreenshotsReporting: false
        }]
    ],
    // ... rest of config
}
```

### Advanced Configuration

```js
// wdio.conf.ts
export const config: Options.Testrunner = {
    // ... other config
    reporters: [
        ['allure', {
            outputDir: 'allure-results',
            clean: true,
            disableWebdriverStepsReporting: false,
            disableWebdriverScreenshotsReporting: false,
            environmentInfo: {
                node: process.version,
                platform: process.platform,
                browser: 'Chrome',
                version: 'latest'
            },
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
                }
            ],
            links: {
                issue: {
                    pattern: ["{}", "https://example.org/issue/{}"],
                    urlTemplate: "https://example.org/issue/%s"
                },
                tms: {
                    pattern: ["{}", "https://example.org/tms/{}"],
                    urlTemplate: "https://example.org/tms/%s"
                }
            },
            globalLabels: {
                framework: 'webdriverio',
                language: 'typescript'
            }
        }]
    ],
    // ... rest of config
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | `string` | `'./allure-results'` | Directory where Allure report files will be written |
| `clean` | `boolean` | `false` | Clean the output directory before running tests |
| `disableWebdriverStepsReporting` | `boolean` | `false` | Disable automatic reporting of WebDriver commands |
| `disableWebdriverScreenshotsReporting` | `boolean` | `false` | Disable automatic reporting of screenshots |
| `environmentInfo` | `Record<string, string>` | `{}` | Custom environment information |
| `categories` | `Category[]` | `[]` | Test result categories configuration |
| `links` | `LinksConfig` | `{}` | Configuration for test case links |
| `globalLabels` | `Record<string, string>` | `{}` | Labels to be added to all test cases |

## Usage Examples

### Basic Test with Allure

```typescript
import { allure } from 'allure-webdriverio';

describe('User Login', () => {
    it('should login successfully with valid credentials', async () => {
        // Add test metadata
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
    });
});
```

### Parameterized Test

```typescript
import { allure } from 'allure-webdriverio';

describe('Cross-browser Testing', () => {
    const browsers = ['chrome', 'firefox', 'safari'];
    
    browsers.forEach(browserName => {
        it(`should work in ${browserName}`, async () => {
            // Add browser parameter
            allure.addParameter('browser', browserName);
            allure.addParameter('environment', process.env.TEST_ENV || 'staging');
            
            // Test implementation
            await browser.url('/');
            await expect($('h1')).toHaveText('Welcome');
        });
    });
});
```

### Test with Attachments

```typescript
import { allure } from 'allure-webdriverio';

describe('Screenshot Tests', () => {
    it('should capture screenshot on failure', async () => {
        try {
            await browser.url('/');
            await expect($('.non-existent-element')).toBeDisplayed();
        } catch (error) {
            // Capture screenshot
            const screenshot = await browser.takeScreenshot();
            allure.addAttachment(
                'Failure Screenshot', 
                Buffer.from(screenshot, 'base64'), 
                'image/png'
            );
            throw error;
        }
    });
});
```

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

Configure links to external systems (issue trackers, test management systems):

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

## API Reference

### Allure Methods

| Method | Description |
|--------|-------------|
| `allure.addLabel(name, value)` | Add a label to the test |
| `allure.addParameter(name, value)` | Add a parameter to the test |
| `allure.addDescription(text)` | Add description to the test |
| `allure.addDescriptionHtml(html)` | Add HTML description to the test |
| `allure.addAttachment(name, content, type)` | Add attachment to the test |
| `allure.addIssue(issueId)` | Add issue link |
| `allure.addTestId(testId)` | Add test case ID |
| `allure.addLink(url, name, type)` | Add custom link |
| `allure.step(name, fn)` | Create a test step |

### Available Labels

| Label | Description |
|-------|-------------|
| `severity` | Test severity (blocker, critical, normal, minor, trivial) |
| `feature` | Feature name |
| `story` | User story |
| `epic` | Epic name |
| `suite` | Test suite name |
| `framework` | Testing framework |
| `language` | Programming language |

## Development

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run tests for this package only
yarn workspace allure-webdriverio test
```

### Building

```bash
# Build the package
yarn build

# Clean build artifacts
yarn clean
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](../../LICENSE) file for details.

## Support

- 📚 [Documentation](https://allurereport.org/docs/)
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support)
- 🐛 [Report Issues](https://github.com/allure-framework/allure-js/issues) 