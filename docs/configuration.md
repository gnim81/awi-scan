# Configuration

Optional file: `awi-scan.config.json`.

```json
{
  "ignore": ["vendor/**"],
  "failOn": "high",
  "agentActions": ["example/agent@v1"],
  "knownSafeActions": ["example/safe-action@v1"],
  "rules": {
    "awi.untrusted-prompt-to-agent": {
      "enabled": true,
      "severity": "critical"
    }
  }
}
```

Defaults are useful without configuration.
