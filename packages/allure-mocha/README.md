# allure-mocha

This project implements Allure integration with Mocha framework.

## Installation

```bash
npm i allure-mocha mocha --save-dev
```
or via yarn:
```bash
yarn add allure-mocha mocha --dev
```

Note that it's recommended to add the following dependencies as well for better user experience:

 - typescript
 - mocha-typescript
 - source-map-support

## Usage

Either add **allure-mocha** into **mocha.opts**:

```text
--ui mocha-typescript
--require source-map-support/register
--reporter allure-mocha
```

Or pass the same value via commandline / scripts:

```bash
mocha -R allure-mocha
```

Now you can access a global **allure** object from within your project:

```typescript
import { MochaAllureInterface } from 'allure-mocha';

declare const allure: MochaAllureInterface;
``` 

## Decorators Support

To make tests more readable and avoid explicit API calls, you can use a special extension - [ts-test-decorators](https://github.com/sskorol/ts-test-decorators).

## Examples

See [mocha-allure2-example](https://github.com/sskorol/mocha-allure2-example) project, which is already configured to use latest Allure 2 features with decorators support.

## Thanks

[@srg-kostyrko](https://github.com/srg-kostyrko) for help and assistance.
