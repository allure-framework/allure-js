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
--reporter allure-mocha
```

Or pass the same value via commandline / scripts:

```bash
mocha -R allure-mocha
```

If you want to provide extra information, such as steps and attachments, import the `allure` object
into your code:

```javascript
// es-modules
import { allure } from "allure-mocha/runtime";
// or commonjs
const { allure } = require("allure-mocha/runtime");

it("is a test", () => {
  allure.epic("Some info");
});
```

## Decorators Support

To make tests more readable and avoid explicit API calls, you can use a special extension - [ts-test-decorators](https://github.com/sskorol/ts-test-decorators).

## Examples

See [mocha-allure2-example](https://github.com/sskorol/mocha-allure2-example) project, which is already configured to use latest Allure 2 features with decorators support.

## Thanks

[@srg-kostyrko](https://github.com/srg-kostyrko) for help and assistance.
