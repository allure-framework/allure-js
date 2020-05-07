# newman-reporter-allure
A newman reporter for generating nice and clean report using Allure-js framework

## Installation
```console
$ npm install -g newman-reporter-allure
```

## Usage
To generate Allure results, specify `allure` in Newman's `-r` or `--reporters` option.

```console
$ newman run <Collection> -e <Environment> -r allure
```

## Generating and Serving Allure report

Allure results will be generated under folder "allure-results" in the root location.
Use allure-commandline to serve the report locally.
  ```console
  $ allure serve
  ```
Generate the static report web-application folder using allure-commandline 
 ```console
  $ allure generate --clean
  ```
  Report will be generated under folder "allure-report" in the root location.


![Screenshot](screenshot.jpg)