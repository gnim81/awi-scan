# Examples

Vulnerable examples live in `examples/vulnerable`.

Safe examples live in `examples/safe`.

Run:

```bash
npx awi-scan examples
```

When working from a local clone, run `npm install`, `npm run build`, then `node dist/cli.js examples --format human --fail-on none`.

The vulnerable examples intentionally combine untrusted event text, agent execution, and workflow privileges. Do not copy them into production workflows.
