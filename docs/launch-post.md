# Launch Post Draft

## Long Form

Agentic Workflow Injection is now a practical GitHub Actions risk, not just a prompt-injection thought experiment.

The risky shape is simple: a workflow reads untrusted issue, pull request, review, discussion, or comment text, passes it to an AI coding agent, and gives that agent repository privileges. A related pattern is just as dangerous: a `pull_request_target` workflow checks out untrusted pull request head code before running an agent. In both cases, attacker-controlled input can influence an agent that has more authority than the attacker.

`awi-scan` is a small offline scanner for that specific problem. It is not a general GitHub Actions linter. It looks for source-to-agent-to-privilege paths in workflow YAML and reports human, JSON, or SARIF output.

Try it:

```bash
npx awi-scan . --format human
```

Example finding:

```text
critical awi.untrusted-checkout-to-agent .github/workflows/agent.yml:14:1
  An AI agent can run after untrusted pull request code is checked out in a privileged workflow.
```

The fix is usually architectural: avoid privileged agents on untrusted text or untrusted PR head checkouts. Prefer trusted triggers, read-only permissions, maintainer approval boundaries, and base-repository checkouts.

Repo: https://github.com/gnim81/awi-scan
npm: https://www.npmjs.com/package/awi-scan

## Short Post

Agentic Workflow Injection is now a real GitHub Actions risk: untrusted issue/PR/comment text, or untrusted PR head code, can reach an AI agent running with repo privileges.

I built `awi-scan`, an offline CLI/GitHub Action that checks workflow YAML for those source-to-agent-to-privilege paths.

```bash
npx awi-scan . --format human
```

Repo: https://github.com/gnim81/awi-scan
