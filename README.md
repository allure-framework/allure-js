# Mocha Allure2 Reporter

[![Build Status](https://travis-ci.com/sskorol/mocha-allure2-reporter.svg?branch=master)](https://travis-ci.com/sskorol/mocha-allure2-reporter)
[![codecov](https://codecov.io/gh/sskorol/mocha-allure2-reporter/branch/master/graph/badge.svg)](https://codecov.io/gh/sskorol/mocha-allure2-reporter)
[![npm version](https://badge.fury.io/js/mocha-allure2-reporter.svg)](https://badge.fury.io/js/mocha-allure2-reporter)

This project implements recent Allure 2 TS [interface](https://github.com/korobochka/allure2-js-commons) for Mocha framework.

## Installation

```bash
npm i mocha-allure2-reporter mocha --save-dev
```
or via yarn:
```bash
yarn add mocha-allure2-reporter mocha --dev
```

Note that it's recommended to add the following dependencies as well for better user experience:

 - typescript
 - mocha-typescript
 - source-map-support
 
[allure2-js-commons](https://github.com/korobochka/allure2-js-commons) comes as an implicit dependency.

## Allure types configuration

Add the following into your **tsconfig.json** to access exported Allure types.
```json
    "typeRoots": [
      "./node_modules/allure2-js-commons/dist/declarations/**/"
    ]
```

## Usage

Either add **mocha-allure2-reporter** into **mocha.opts**:

```text
--ui mocha-typescript
--require source-map-support/register
--reporter mocha-allure2-reporter
```

Or pass the same value via commandline / scripts:

```bash
mocha -R mocha-allure2-reporter
```

Now you can access a global **allure** object from within your project:

```typescript
const allure: AllureInterface = global.allure;
``` 

A full API is listed in [AllureInterface.ts](https://github.com/korobochka/allure2-js-commons/blob/master/src/AllureInterface.ts).

## Decorators Support

To make tests more readable and avoid explicit API calls, you can use a special extension - [ts-test-decorators](https://github.com/sskorol/ts-test-decorators).

## Examples

See [mocha-allure2-example](https://github.com/sskorol/mocha-allure2-example) project, which is already configured to use latest Allure 2 features with decorators support.

## Thanks

[@srg-kostyrko](https://github.com/srg-kostyrko) for help and assistance.
