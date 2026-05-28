# SARIF Upload

`awi-scan` can emit SARIF so findings appear in GitHub code scanning.

Use the GitHub Action with `format: sarif`, then upload the generated file with `github/codeql-action/upload-sarif`.

```yaml
name: awi-scan
on:
  pull_request:
  push:
    branches: [main, master]
permissions:
  contents: read
  security-events: write
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gnim81/awi-scan@v0.1.4
        with:
          format: sarif
          output: awi-scan.sarif
          fail-on: high
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: awi-scan.sarif
```

The `if: always()` condition lets GitHub upload the SARIF report even when `awi-scan` finds a high or critical issue and fails the job.

For local review after building the repository:

```bash
node dist/cli.js examples --format sarif --output awi-scan.sarif --fail-on none
```
