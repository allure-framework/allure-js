# allure-js-commons

Interface for Allure to be used from Javascript and TypeScript.
There you can find primitives to create custom integrations for the javascript testing frameworks.

## API Overview

### Labels environment variables

Allure allows to use environment variables for setting test labels.
Using `ALLURE_LABEL_{{labelName}}={{labelValue}}` syntax you can set common labels for all of your tests.

#### Examples

```bash
ALLURE_LABEL_EPIC="Story 1" npm test
```
