# Contribute

## Introduction

First, thank you for considering contributing to allure-js! It's people like you that make the open source community such a great community! 😊

We welcome any type of contribution, not only code. You can help with

- **QA**: file bug reports, the more details you can give the better (e.g. screenshots with the console open)
- **Marketing**: writing blog posts, howto's, printing stickers, ...
- **Community**: presenting the project at meetups, organizing a dedicated meetup for the local community, ...
- **Code**: take a look at the [open issues](https://github.com/allure-framework/allure-js/issues). Even if you can't write code, commenting on them, showing that you care about a given issue matters. It helps us triage them.
- **Money**: we welcome financial contributions in full transparency on our [open collective](https://opencollective.com/allure-report).

## Your First Contribution

Working on your first Pull Request? You can learn how from this _free_ series, [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

## Submitting code

Fork, then clone the repo:

```bash
$ git clone git@github.com:your-username/allure-js.git
```

Use Node.js 24.11 or newer in the 24.x line, or Node.js 26. Install [Corepack](https://github.com/nodejs/corepack) if it isn't bundled with your Node.js installation, then run `corepack enable` to use the repository's pinned Yarn version.

Then install core dependencies:

```bash
yarn install --immutable
```

Then build and link all packages:

```bash
yarn build
```

Yarn uses the repository-local Vite+ CLI for builds, formatting, and linting; no global `vp` install is needed. Run `yarn verify` for all checks. Full builds compile `allure-js-commons` first because Vite+ follows its optional Playwright runtime peer, which is not a compile dependency. CI shards still use Yarn to compile only the packages they need.

Make your change. Add tests for your change. Make sure all the tests pass:

```bash
yarn test
```

Push your fork and submit a pull request.

## Code review process

The bigger the pull request, the longer it will take to review and merge. Try to break down large pull requests in smaller chunks that are easier to review and merge.
It is also always helpful to have some context for your pull request. What was the purpose? Why does it matter to you?

## Financial contributions

We also welcome financial contributions in full transparency on our [open collective](https://opencollective.com/allure-report).
Anyone can file an expense. If the expense makes sense for the development of the community, it will be "merged" in the ledger of our open collective by the core contributors and the person who filed the expense will be reimbursed.

## Questions

If you have any questions, create an [issue](issue) (protip: do a quick search first to see if someone else didn't ask the same question before!).
You can also reach us at hello@allure-report.opencollective.com.

## Credits

### Gold sponsors

[Become a gold sponsor](https://opencollective.com/allure-report#sponsor) and get your logo on our README on Github with a link to your site.

<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/0/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/1/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/2/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/3/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/4/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/5/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/6/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/7/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/7/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/8/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/8/avatar.svg?requireActive=false&avatarHeight=400"></a>
<a href="https://opencollective.com/allure-report/tiers/gold-sponsors/9/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/gold-sponsors/9/avatar.svg?requireActive=false&avatarHeight=400"></a>

### Silver sponsors

[Become a silver sponsor](https://opencollective.com/allure-report#sponsor) and get your logo on our README on Github with a link to your site.

<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/0/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/1/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/2/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/3/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/4/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/5/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/6/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/7/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/7/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/8/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/8/avatar.svg?requireActive=false&avatarHeight=300"></a>
<a href="https://opencollective.com/allure-report/tiers/silver-sponsors/9/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/silver-sponsors/9/avatar.svg?requireActive=false&avatarHeight=300"></a>

### Bronze sponsors

[Become a bronze sponsor](https://opencollective.com/allure-report#sponsor) and get your logo on our README on Github with a link to your site.

<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/0/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/1/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/2/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/3/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/4/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/5/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/6/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/7/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/7/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/8/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/8/avatar.svg?requireActive=false&avatarHeight=200"></a>
<a href="https://opencollective.com/allure-report/tiers/bronze-sponsors/9/website?requireActive=false" target="_blank"><img src="https://opencollective.com/allure-report/tiers/bronze-sponsors/9/avatar.svg?requireActive=false&avatarHeight=200"></a>

### Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/allure-report#backer)]

<a href="https://opencollective.com/allure-report#backers" target="_blank"><img src="https://opencollective.com/allure-report/tiers/backers.svg?avatarHeight=36&width=890&showBtn=false"></a>

### Contributors

This project exists thanks to all the people who contribute. [[Contribute]](.github/CONTRIBUTING.md).

<a href="graphs/contributors"><img src="https://opencollective.com/allure-report/contributors.svg?avatarHeight=24&width=890&showBtn=false" /></a>

<!-- This `CONTRIBUTING.md` is based on @nayafia's template https://github.com/nayafia/contributing-template -->
