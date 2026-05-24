# Threat Model

`awi-scan` models Agentic Workflow Injection in GitHub Actions.

The scanner looks for three ingredients:

1. Attacker-controlled text from GitHub events or API calls.
2. An AI agent, LLM CLI, or prompt-consuming action.
3. Workflow privileges such as write permissions, secrets, OIDC, self-hosted runners, or `pull_request_target`.

The scanner is intentionally static and offline. It does not send workflow contents to a service.

## Limitations

`awi-scan` does not fully parse shell, JavaScript, Python, or agent internals. It reports explainable workflow-level evidence and may miss flows hidden behind custom scripts.

The first release focuses on GitHub Actions. Other CI systems are out of scope.
