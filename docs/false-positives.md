# False Positives

`awi-scan` is a static workflow scanner. It reports explainable workflow-level evidence, so a finding can be a false positive when a repository has an approval or sanitization boundary that is not visible in the workflow YAML.

## Common Causes

Common false positive cases include:

- A maintainer-controlled label, environment protection rule, or manual gate exists outside the scanned workflow.
- The workflow passes untrusted text as quoted context but the agent is strongly restricted from tool use.
- A custom script sanitizes or summarizes untrusted text before it reaches the agent.
- Secrets or write permissions are technically present but not reachable by the agent step.

These cases are worth reviewing rather than ignoring automatically. The purpose of the finding is to make the source-to-agent-to-privilege path visible.

## How To Reduce Risk

Prefer patterns that are visible in workflow code:

- Use trusted triggers such as `workflow_dispatch` for privileged agent runs.
- Keep default permissions read-only.
- Add explicit maintainer approval before using issue, pull request, review, discussion, or comment text.
- Avoid passing raw untrusted text directly into `prompt`, `instruction`, `task`, `message`, or similar inputs.
- Keep secrets out of agent steps unless they are strictly required.

## Reporting A False Positive

Open an issue with:

- The minimal workflow snippet.
- The finding rule id and severity.
- The approval, sanitization, or privilege boundary that makes the workflow safe.
- Whether the boundary is visible in YAML or enforced elsewhere.

Before changing detector behavior, contributors should add a safe fixture and run:

```bash
npm run check
```
