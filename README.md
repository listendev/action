# listendev/action

> Get real-time dependency insights in your pull requests 🐬

![image](https://github.com/listendev/action/assets/3413596/94718f08-320f-4948-88e9-48b7703da359)
See [demo video](https://www.loom.com/share/d6662a575b41478fb4ddceef39ba1d57?sid=84017f2c-abdb-459f-b002-3c0b90e45845).

## Usage

See [action.yml](action.yml).

### Basic

```yaml
steps:
  - uses: listendev/action@v0.2.1
```

### Full

```yaml
steps:
  - uses: listendev/action@v0.2.1
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

## License

The scripts and documentation in this project are released under the [Apache 2.0](LICENSE) license.

## Contributions

Contributions are always welcome!

See [contributor's guide](.github/CONTRIBUTING.md).

### Code of Conduct

Practice kindness. ✨

See [our code of conduct](https://github.com/listendev/.github/blob/main/CODE_OF_CONDUCT.md).
