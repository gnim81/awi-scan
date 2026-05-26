# Contributing

Thanks for helping improve `awi-scan`.

This project is intentionally narrow: it focuses on Agentic Workflow Injection in GitHub Actions, not general GitHub Actions linting. A good contribution should make the scanner more accurate, easier to run, or clearer for maintainers evaluating AI agent workflows.

## Good First Contributions

Useful starter contributions include:

- Add a vulnerable and safe fixture for an AI agent action or CLI pattern.
- Improve documentation for an existing rule.
- Add a concise remediation example.
- Report a false positive or false negative with a minimal workflow snippet.

## Development

Install dependencies:

```bash
npm install
```

Run the full check:

```bash
npm run check
```

Run the scanner locally after building:

```bash
npm run build
node dist/cli.js examples --format human --fail-on none
```

## Detector Changes

Every new or changed detector behavior should include:

- A vulnerable fixture that should produce a finding.
- A safe fixture that should not produce a finding.
- A focused test that fails before the implementation change.
- Updated public documentation when user-facing behavior changes.

Keep rules explainable at the workflow level. `awi-scan` does not try to become a full shell, JavaScript, Python, or agent runtime taint analyzer.

## Pull Requests

Before opening a pull request:

- Run `npm run check`.
- Keep the change focused.
- Preserve JSON and SARIF output shape unless the change intentionally updates those formats.
- Do not include secrets, generated local reports, or private planning material.

Security-sensitive reports can be handled through the process in `SECURITY.md`.
