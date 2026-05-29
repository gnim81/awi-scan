# Agent Actions

`awi-scan` looks for untrusted GitHub event text flowing into AI agent actions, LLM-backed coding tools, or agent CLIs that run inside GitHub Actions workflows.

The scanner is intentionally focused on Agentic Workflow Injection. It does not try to classify every workflow action or every GitHub Actions hardening issue.

## Built-In Coverage

Current matcher coverage includes common naming patterns for:

- Claude Code actions and Claude CLI usage.
- OpenAI Codex action or CLI usage.
- Gemini action or CLI usage.
- Aider CLI usage.
- OpenCode CLI usage.
- Copilot-style agent actions as public patterns stabilize.
- Cursor-style agent actions.

The scanner also checks prompt-like inputs on recognized agent actions, including `prompt`, `instruction`, `instructions`, `task`, `message`, `body`, `query`, and `input`.

`awi-scan` also detects a related checkout risk: a `pull_request_target` workflow that checks out the untrusted pull request head before running an agent. In that case, attacker-controlled code can influence files, prompts, configuration, or tools used by the agent even when the prompt text itself is static.

## What Makes A Finding

An agent action or CLI is only one ingredient. `awi-scan` reports the high-risk pattern when it can also see:

- Untrusted GitHub text, such as issue, pull request, review, discussion, or comment content.
- A privileged workflow context, such as `pull_request_target`, write permissions, secrets, OIDC, or self-hosted runners.

This keeps the rule focused on source-to-agent-to-privilege paths instead of flagging every use of an AI tool.

## Adding Coverage

When requesting or contributing a new sink pattern, include both examples:

- A vulnerable fixture where untrusted event text reaches the agent in a privileged workflow.
- A safe fixture where the agent runs without untrusted text or without meaningful privileges.

Run the checks before opening a pull request:

```bash
npm run check
```

If you are reporting a missed pattern, include the workflow trigger, permissions, agent action or CLI command, and the exact prompt/input field that receives untrusted text.
