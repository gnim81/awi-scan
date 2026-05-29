# Examples

Vulnerable examples live in `examples/vulnerable`.

Safe examples live in `examples/safe`.

Run:

```bash
npx awi-scan examples
```

When working from a local clone, run `npm install`, `npm run build`, then `node dist/cli.js examples --format human --fail-on none`.

The vulnerable examples intentionally combine untrusted event text, agent execution, and workflow privileges. Do not copy them into production workflows.

Current vulnerable fixtures cover:

- Claude Code Action with untrusted pull request text.
- Generic agent CLI with untrusted issue comment text.
- `pull_request_target` checkout of untrusted pull request head code before agent execution.
- Gemini CLI with untrusted issue text.
- Aider CLI with untrusted pull request text.

Current safe fixtures cover trusted `workflow_dispatch` prompts and base-repository checkouts with read-only permissions.
