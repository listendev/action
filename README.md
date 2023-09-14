# listendev/action

> Get real-time dependency insights in your pull requests 🐬

![image](https://github.com/listendev/action/assets/3413596/94718f08-320f-4948-88e9-48b7703da359)
See [demo video](https://www.loom.com/share/d6662a575b41478fb4ddceef39ba1d57?sid=84017f2c-abdb-459f-b002-3c0b90e45845).

## Usage

See [action.yml](action.yml).

### Basic

```yaml
steps:
  - uses: listendev/action@v0.2.2
```

### Full

```yaml
steps:
  - uses: listendev/action@v0.2.2
    with:
      # The Github API token.
      # Defaults to ${{ github.token }}
      token: "..."
      # The lstn version.
      # Defaults to the latest lstn release tag.
      lstn: "vX.Y.Z"
      # The working directory relative to the root one.
      # Defaults to the root directory.
      workdir: "."
      # One or more reporting mechanisms (gh-pull-comment,gh-pull-review,gh-pull-check)
      reporter: "gh-pull-comment"
      # Addition lstn flags for power users
      lstn_flags: ""
```

### Examples

Let's say you want results in JSON format...

```yaml
steps:
  - uses: listendev/action@v0.2.2
    with:
      lstn_flags: "--json"
```

Let's say you only care for high severity verdicts...

```yaml
steps:
  - uses: listendev/action@v0.2.2
    with:
      lstn: "v0.9.0"
      lstn_flags: "--select '@.severity == \"high\"'"
```

You can select the verdicts also with the `select` input.

Let's say we only care for dynamic instrumentation verdicts regarding processes...

```yaml
steps:
  - uses: listendev/action@v0.2.2
    with:
      select: "(@.file =~ \"^dynamic\" && \"process\" in @.categories)"
```

## Development

To develop this GitHub action you first need to install its dependencies:

```bash
npm run i
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
