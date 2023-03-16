## Contributing

Hello!

Thank you for your interest in contributing to this repository!

We accept pull requests for bug fixes and features where we've discussed the approach in an issue and given the go-ahead for a community member to work on it. We'd also love to hear about ideas for new features as issues.

Please **do**:

- Check existing issues to verify that the [`bug`][bug issues] or [`feature request`][feature request issues] has not already been submitted.
- Open an issue if things aren't working as expected.
- Open an issue to propose a significant change.
- Open a pull request to fix a bug.
- Open a pull request to fix documentation about a command.
- Open a pull request for any issue labelled [`help wanted`][hw] or [`good first issue`][gfi].

Please **avoid**:

- Opening pull requests for issues marked [`needs-design`][needs design], [`needs-investigation`][needs investigation], or [`blocked`][blocked].
- Opening pull requests for any issue marked [`core`][core].
  - These issues require additional context from the core CLI team and any external pull requests will not be accepted.

## Building the listendev/action

Prerequisites:

- Node.js 16.x

Build with:

```bash
npm i
npm run make
```

## Testing the listendev/action

Run tests with: `npm run test`

## Commit convention

We enforce the commits to follow the [Conventional Commits v1.0 spec](https://www.conventionalcommits.org/en/v1.0.0/) with the following (the default one) set of prefixes:

<dl>
  <dt>build</dt>
  <dd>you're changing something in the build system</dd>
  <dt>ci</dt>
  <dd>you're taking care of our CI and automation</dd>
  <dt>chore</dt>
  <dd>little changes like typos; generally nothing very significant</dd>
  <dt>docs</dt>
  <dd>you are helping us with documentation</dd>
  <dt>feat</dt>
  <dd>your changes implement a new feature or update an existing one</dd>
  <dt>fix</dt>
  <dd>we'll always be grateful to you for your bug fixes</dd>
  <dt>perf</dt>
  <dd>you wrote a beautiful Go benchmark</dd>
  <dt>refactor</dt>
  <dd>when you are moving pieces around, changing file names, etc.</dd>
  <dt>revert</dt>
  <dd>you're reverting some changes: it may happen</dd>
  <dt>test</dt>
  <dd>your changes introduce, extend, or update some tests</dd>
</dl>

Let us now provide you some examples of commit messages we accept:

```
chore: make linter happy
chore: fix a little typo
test: check edge case X doesn't happen
fix: ensure edge case X doesn't verify anymore
test: ensure lstn installation works correctly on windows runners
docs: improve the commit convention examples
build: make everything
feat!: change the parameter X
```

Notice that by using `!` after the prefix and before the colon you are communicating **breaking changes**.

Enforcing the commits to follow this convention helps us:

- keep the commit history readable
- have an easily understandable commit history
- manually label the pull requests accordingly

Thank you for sticking to using it!

Notice that we check the commit messages and lint them on every pull request. Should you find some bugs with the commit linting process, you can notify the author of the underlying parser at [leodido/go-conventionalcommits](https://github.com/leodido/go-conventionalcommits).

Notice also that the enforcement of the Conventional Commit v1.0 spec is from v0.1.0 onwards, previous git history may not follow it perfectly.

## Submitting a pull request

We also enforce the **pull requests titles** to follow the [Conventional Commits v1.0 spec](https://www.conventionalcommits.org/en/v1.0.0/).

This because we have machinery in place that automatically labels the pull requests depending on the:

- the path and file changes
- the title of the pull request
- the branch name of the pull request

You can see the rules we use [here](../reviewpad.yml).

It helps us automatically generate a wonderful changelog!

Let's say that you spot a bug and you wanna fix it...
You can open a pull request with title `fix: some subtle bug` and it will be automatically labeled with the `bug` label.

1. Create a new branch: `git checkout -b fix/some-subtle-bug`
1. Make your change, add tests, and ensure tests pass
1. Submit a pull request: `gh pr create --web`

Please write **small pull requests** to ease our review and maintenance burdens.

Contributions to this project are [released][legal] to the public under the [project's open source license][license].

Please note that this project adheres to a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Releases

_TODO_

## Resources

- [How to Contribute to Open Source][]
- [Using Pull Requests][]
- [GitHub Help][]

[bug issues]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3Abug
[feature request issues]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement
[hw]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3A"help+wanted"
[blocked]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3Ablocked
[needs design]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3A"needs+design"
[needs investigation]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3A"needs+investigation"
[gfi]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3A"good+first+issue"
[core]: https://github.com/listendev/action/issues?q=is%3Aopen+is%3Aissue+label%3Acore
[legal]: https://docs.github.com/en/free-pro-team@latest/github/site-policy/github-terms-of-service#6-contributions-under-repository-license
[license]: ../LICENSE
[code-of-conduct]: https://github.com/listendev/.github/blob/main/CODE_OF_CONDUCT.md
[how to contribute to open source]: https://opensource.guide/how-to-contribute/
[using pull requests]: https://docs.github.com/en/free-pro-team@latest/github/collaborating-with-issues-and-pull-requests/about-pull-requests
[github help]: https://docs.github.com/
