# allure-js-commons

Interface for Allure 2 to be used from Javascript and TypeScript.
This is not intended to be used by the projects directly, only as a foundation for test framework reporters.

### Authors

Ilya Korobitsyn <mail@korobochka.org>

### Labels environment variables

Allure allows to use environment variables for setting test labels.
Using `ALLURE_LABEL_{{labelName}}={{labelValue}}` syntax you can set common labels for all of your tests.

#### Examples

```bash
ALLURE_LABEL_EPIC="Story 1" npm test
```
