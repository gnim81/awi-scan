# Rules

## awi.untrusted-prompt-to-agent

Flags workflows where untrusted GitHub event content reaches an AI agent or LLM-backed coding tool.

Examples of untrusted sources:

- `github.event.pull_request.body`
- `github.event.issue.body`
- `github.event.comment.body`
- `GITHUB_EVENT_PATH`
- `gh issue`, `gh pr`, or `gh api` calls that fetch user-controlled text

High-risk sinks include agent actions, agent CLIs, and action inputs such as `prompt`, `instruction`, `task`, or `message` on recognized agent-like actions.

Recommended fix: do not send raw untrusted text directly to privileged agents. Use trusted triggers, read-only permissions, explicit maintainer approval, and strong tool restrictions.

## awi.agent-output-to-privileged-step

Reserved for follow-up flow analysis where agent output is executed or sent to privileged APIs. The first release documents the rule id and remediation so SARIF consumers have a stable rule catalog.

## awi.untrusted-checkout-to-agent

Flags `pull_request_target` workflows where `actions/checkout` checks out an untrusted pull request head before an AI agent runs.

Risky checkout indicators include:

- `repository: ${{ github.event.pull_request.head.repo.full_name }}`
- `ref: ${{ github.event.pull_request.head.sha }}`
- `ref: ${{ github.event.pull_request.head.ref }}`

This pattern can let attacker-controlled code influence files, prompts, configuration, or tools consumed by a privileged agent.

Recommended fix: do not run privileged agents on untrusted pull request head code. Use the base repository checkout, require maintainer approval, or move agent execution to a read-only `pull_request` workflow.
