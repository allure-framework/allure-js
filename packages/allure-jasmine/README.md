# allure-jasmine

> Allure integration Jasmine framework

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://allurereport.org/public/img/allure-report.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://allurereport.org/public/img/allure-report.svg">
  <img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />
</picture>

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

For usage example see `test/Setup.ts`

## Usage with Jest (`jest@<27`)

Use your favorite node package manager to install required packages:

```bash
npm add -D jest-jasmine2 allure-jasmine allure-js-commons @types/jasmine
```

Create `allure-setup.ts` file:

```ts
import { JasmineAllureReporter } from "allure-jasmine";
import { JasmineAllureInterface } from "allure-jasmine/dist/src/JasmineAllureReporter";

const reporter = new JasmineAllureReporter({ resultsDir: "allure-results" });

jasmine.getEnv().addReporter(reporter);
// @ts-expect-error
global.allure = reporter.getInterface();

declare global {
  const allure: JasmineAllureInterface;
}
```

Change your `jest.config.js` file:

```js
module.exports = {
  preset: "ts-jest",
+  testRunner: "jest-jasmine2",
+  setupFilesAfterEnv: ["./allure-setup.ts"],
};
```

You can find example setup and usage in this [repo](https://github.com/vovsemenv/allure-jest-example)

[allure-jest]: https://github.com/allure-framework/allure-js/tree/master/packages/allure-jest
