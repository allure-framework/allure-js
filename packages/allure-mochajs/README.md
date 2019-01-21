# allure-mochajs

This project implements Allure integration with Mocha framework.

## Installation

```bash
npm i allure-mochajs mocha --save-dev
```
or via yarn:
```bash
yarn add allure-mochajs mocha --dev
```

Note that it's recommended to add the following dependencies as well for better user experience:

 - typescript
 - mocha-typescript
 - source-map-support

## Allure types configuration

Add the following into your **tsconfig.json** to access exported Allure types.
```json
    "typeRoots": [
      "./node_modules/allure-js-commons/dist/declarations/**/"
    ]
```

## Usage

Either add **allure-mochajs** into **mocha.opts**:

```text
--ui mocha-typescript
--require source-map-support/register
--reporter allure-mochajs
```

Or pass the same value via commandline / scripts:

```bash
mocha -R allure-mochajs
```

Now you can access a global **allure** object from within your project:

```typescript
const allure: AllureInterface = global.allure;
``` 

## Decorators Support

To make tests more readable and avoid explicit API calls, you can use a special extension - [ts-test-decorators](https://github.com/sskorol/ts-test-decorators).

## Examples

See [mocha-allure2-example](https://github.com/sskorol/mocha-allure2-example) project, which is already configured to use latest Allure 2 features with decorators support.

## Thanks

[@srg-kostyrko](https://github.com/srg-kostyrko) for help and assistance.
