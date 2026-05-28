# Examples

Vulnerable examples live in `examples/vulnerable`.

Safe examples live in `examples/safe`.

Run:

```bash
npm install
npm run build
node dist/cli.js examples --format human --fail-on none
```

After npm publication, the same examples can be scanned with `npx awi-scan examples`.

The vulnerable examples intentionally combine untrusted event text, agent execution, and workflow privileges. Do not copy them into production workflows.
