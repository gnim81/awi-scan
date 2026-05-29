# Safe pull_request_target Agent Patterns

`pull_request_target` runs in the context of the base repository. That makes it useful for maintainer-controlled automation, but dangerous when combined with untrusted pull request text, untrusted pull request head code, or AI agents that receive repository privileges.

## Avoid This Shape

Do not checkout the pull request head and then run an AI agent in the same privileged job:

```yaml
on:
  pull_request_target:
permissions:
  contents: write
jobs:
  agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: ${{ github.event.pull_request.head.repo.full_name }}
          ref: ${{ github.event.pull_request.head.sha }}
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: Review this pull request
```

The checked-out code is controlled by the pull request author. Files in that workspace can influence prompts, tools, config, scripts, or dependencies consumed by the agent.

## Safer Default

Keep privileged agent workflows on trusted inputs:

```yaml
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: Summarize trusted release notes
```

## If You Need pull_request_target

Use `pull_request_target` only for narrowly scoped maintainer-controlled tasks:

- Checkout the base repository, not the pull request head.
- Keep permissions read-only unless a write is required.
- Do not pass raw issue, pull request, review, discussion, or comment text directly to an agent.
- Require a maintainer label, comment command, or manual approval before privileged agent execution.
- Move untrusted code analysis to a separate `pull_request` workflow with read-only permissions.

When in doubt, treat untrusted pull request text and pull request head code as attacker-controlled input.
