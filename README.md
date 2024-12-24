# listendev/action

> Proactive Security Monitoring Inside GitHub Actions 🐬

_Observe network, file, and process behaviors during every workflow run and flags anomalous and malicious activities — such as connections to unknown IPs or unauthorized source code changes – in your GitHub actions workflows._

## Usage

See [action.yml](action.yml).

### Basic

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      runtime: only
      jwt: ${{ secrets.LSTN_API_KEY }}
```

### Full

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      # The Github API token.
      # Defaults to ${{ github.token }}
      token: "..."
      # The listen.dev JWT token.
      # Defaults to empty string.
      jwt: ${{ secrets.MY_JWT_TOKEN }}
      # Whether to enable the eavesdrop tool or not to inspect the runtime threats in your CI.
      # Works only on linux runners. Requires a valid `jwt` option.
      # Defaults to false.
      runtime: "true|false|only"
      # The lstn version.
      # Defaults to the latest lstn release tag (recommended).
      lstn: "vX.Y.Z"
      # The working directory relative to the root one.
      # Defaults to the root directory.
      workdir: "."
      # The path to the YAML configuration file.
      # Or the path of the directory containing a .lstn.yaml file.
      # Defaults to empty.
      config: "..."
      # One or more reporting mechanisms (gh-pull-comment,gh-pull-review,gh-pull-check,pro)
      # Defaults to "gh-pull-comment" when there is no JWT input, to "pro" otherwise.
      reporter: "gh-pull-comment"
      # Addition lstn flags for power users
      lstn_flags: ""
```

### Connect to listen.dev

Just [create a secret](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) and pass it to the `jwt` input...

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      runtime: true
      jwt: ${{ secrets.LSTN_API_KEY }}
```

When the action notices that the [listen.dev](https://listen.dev) JWT secret exists, it will automatically override the reporter to the `pro` one.

Because of the `runtime` option set to `true`, it will also start the CI eavesdrop tool under the hoods.

Notice it only works on linux runners.

**Where to get your JWT token?**

[How to get your API key from the project settings](https://docs.listen.dev/workflows/generate-api-token).

It's _recommended_ to regenerate the JWT token for every release, until we will release stable versions.

<details>
<summary>Do you also want to also use another reporter together with the pro one?</summary>

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      jwt: ${{ secrets.LSTN_API_KEY }}
      lstn_flags: "--reporter gh-pull-comment"
```
</details>

### Examples

Let's say you don't want verdicts and events about the dependencies into your lockfiles.
Or maybe your repository doesn't contain lockfiles (package-lock.json, poetry.lock, etc.) at all...

So, you only want it to eavesdrop for runtime threats...

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      runtime: only
      jwt: ${{ secrets.LSTN_API_KEY }}
```

Let's say you want the verdicts in JSON format...

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      lstn_flags: "--json"
```

Let's say you only care for high severity verdicts...

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      lstn: "v0.14.1"
      lstn_flags: "--select '@.severity == \"high\"'"
```

You can select the verdicts also with the `select` input.

Let's say we only care for dynamic instrumentation verdicts regarding processes...

```yaml
steps:
  - uses: listendev/action@v0.14.1
    with:
      select: "(@.file =~ \"^dynamic\" && \"process\" in @.categories)"
```

## Development

To develop this GitHub action you first need to install its dependencies:

```bash
npm install
```

You can then use `npm run build` to compile it. Also, remember that we check on every pull request that you've run this command, as to avoid the `dist/` directory to be out of sync.

You can also run unit tests locally with the `npm run test` command.

The CI makes extensive use of the official [GitHub reusable workflows](https://github.com/actions/reusable-workflows) for developing actions following best practices (see the [.github](./.github) directory).

## License

The scripts and documentation in this project are released under the [Apache 2.0](LICENSE) license.

## Contributions

Contributions are always welcome!

See [contributor's guide](.github/CONTRIBUTING.md).

### Code of Conduct

Practice kindness. ✨

See [our code of conduct](https://github.com/listendev/.github/blob/main/CODE_OF_CONDUCT.md).
