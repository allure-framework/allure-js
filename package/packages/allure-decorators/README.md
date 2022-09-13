# Allure Decorators

This project introduces TS decorators integration for Allure framework.

## Installation based on allure-mocha reporter

```bash
npm i allure-js-commons allure-decorators allure-mocha @testdeck/mocha mocha @types/mocha mocha-multi-reporters source-map-support --save-dev
```
or via yarn:
```bash
yarn add allure-js-commons allure-decorators allure-mocha @testdeck/mocha mocha @types/mocha mocha-multi-reporters source-map-support --dev
```

## Usage

Create the following **.mocharc.json**:

```json
{
  "require": "source-map-support/register",
  "spec": "./src/tests/**/*.js",
  "reporter": "mocha-multi-reporters",
  "reporter-option": "configFile=reporterConfig.json"
}
```

And the **reporterConfig.json**:

```json
{
  "reporterEnabled": "allure-mocha, list",
  "allureMochaReporterOptions": {
    "resultsDir": "./allure-results"
  }
}
```

Note that there are known issues with Mocha 8+ parallel test execution. So try to avoid using this flag at the moment.

Your **tsconfig.json** must include the following compiler options:

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

Now your test may look like the following:

```typescript
import { suite, test } from '@testdeck/mocha'
import {
  assignPmsUrl,
  assignTmsUrl,
  data,
  decorate,
  description,
  epic,
  feature,
  issue,
  owner,
  severity,
  story,
  tag,
  testCaseId
} from 'allure-decorators'
import { ContentType, Severity } from 'allure-js-commons'
import { allure, MochaAllure } from 'allure-mocha/runtime'
// the other imports

@suite
class AuthorizationTests {

  public static testData = (): User[] => {
    return [User.dummy(), User.dummy1()]
  }

  @issue('11')
  @testCaseId('10')
  @severity(Severity.BLOCKER)
  @epic('User Authentication')
  @feature('Login')
  @story('Authorization')
  @owner('skorol')
  @tag('smoke')
  @description('Basic authorization test.')
  @data(AuthorizationTests.testData)
  @data.naming(user => `${user} should be able to sign`)
  @test
  public userShouldBeAbleToSignIn(user: User) {
    open(LoginPage)
      .loginWith(user)
      .select(ProfilePage)

    verifyThat(atProfilePage)
      .fullNameIs(user.fullName)
      .usernameIs(user.username)
  }

  public before() {
    decorate<MochaAllure>(allure)
    assignTmsUrl(process.env.TMS_URL)
    assignPmsUrl(process.env.PMS_URL)
  }

  public after() {
    allure.attachment('Test attachment', 'test attachment content', ContentType.TEXT)
  }
}
```

You should pay attention to the following line:

```typescript
decorate<MochaAllure>(allure)
```

To be able to use decorators, you have to call `decorate` function explicitly and set your reporter's instance in `before` hook. This was done intentionally to allow clients decide which reporter they want to use with decorators module.  

Note that `data` is a [testdeck](https://github.com/testdeck/testdeck) specific extension which allows injecting parameters into Allure scope.
At the moment, **testdeck** supports only Mocha, Jest and Jasmine frameworks.
If you want to add the other integration, feel free to contact Allure team to discuss the potential design options. 


#### ToDo

- [ ] Update [mocha-allure2-example](https://github.com/sskorol/mocha-allure2-example) with new `allure-decorators` dependency.   
- [ ] Explore potential `data` decorator extension for the other frameworks.
