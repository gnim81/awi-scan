# Security Policy

## Scope

`awi-scan` detects Agentic Workflow Injection risks in GitHub Actions workflows. Security reports are in scope when they affect the scanner, the GitHub Action wrapper, release artifacts, or documented remediation guidance.

Examples of in-scope reports:

- A workflow pattern where untrusted GitHub issue, pull request, review, discussion, or comment text reaches an AI agent but `awi-scan` misses it.
- A false negative involving privileged contexts such as `pull_request_target`, write permissions, secrets, OIDC, or self-hosted runners.
- A release, package, or GitHub Action behavior that could mislead users about scan results.

Examples that are usually out of scope:

- Generic GitHub Actions hardening issues that do not affect Agentic Workflow Injection.
- Vulnerabilities in third-party AI agent actions or CLIs, unless they need a scanner rule or documentation change here.
- Social engineering or spam against project maintainers.

## Reporting

If the report can be discussed publicly, open a GitHub issue with a minimal workflow snippet and the expected finding.

If public disclosure would create risk for an active repository, use GitHub private vulnerability reporting for this repository when available. Include:

- The workflow snippet or a link to the affected workflow.
- The AI agent action or CLI involved.
- The trigger, permissions, secrets, runner, and checkout behavior.
- The expected `awi-scan` result and the actual result.

Do not include secrets, tokens, private keys, or confidential repository content in an issue.

## Triage

Maintainers aim to respond within one working day. Confirmed false negatives are prioritized over false positives and documentation gaps. New detector behavior should include a vulnerable fixture, a safe fixture, and verification with:

```bash
npm run check
```

## Supported Versions

Only the latest release is actively supported. Users should upgrade to the newest GitHub release and npm package once published.
